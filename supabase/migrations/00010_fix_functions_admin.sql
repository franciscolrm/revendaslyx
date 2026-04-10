-- ============================================================
-- MIGRATION 00010: Fix advance/revert functions to accept user_id
-- (for service_role/admin client calls from backend)
-- ============================================================

-- Recriar advance_process_stage aceitando p_user_id opcional
CREATE OR REPLACE FUNCTION advance_process_stage(
  p_process_id UUID,
  p_user_id UUID DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_process resale_processes%ROWTYPE;
  v_current_stage flow_stages%ROWTYPE;
  v_next_stage flow_stages%ROWTYPE;
  v_resolved_user_id UUID;
  v_history_id UUID;
BEGIN
  -- Usa p_user_id se fornecido (admin client), senão pega do auth
  v_resolved_user_id := COALESCE(p_user_id, current_app_user_id());

  SELECT * INTO v_process FROM resale_processes WHERE id = p_process_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Processo não encontrado';
  END IF;

  IF v_process.status != 'active' THEN
    RAISE EXCEPTION 'Processo não está ativo';
  END IF;

  SELECT * INTO v_current_stage FROM flow_stages WHERE id = v_process.current_stage_id;

  SELECT * INTO v_next_stage FROM flow_stages
  WHERE flow_type_id = v_process.flow_type_id
    AND stage_order = v_current_stage.stage_order + 1
    AND is_active = true;

  IF NOT FOUND THEN
    UPDATE resale_processes SET
      status = 'completed',
      completed_at = now()
    WHERE id = p_process_id;

    RETURN jsonb_build_object('status', 'completed', 'message', 'Processo concluído');
  END IF;

  INSERT INTO process_stage_history (process_id, from_stage_id, to_stage_id, changed_by, notes)
  VALUES (p_process_id, v_current_stage.id, v_next_stage.id, v_resolved_user_id, p_notes)
  RETURNING id INTO v_history_id;

  UPDATE resale_processes SET current_stage_id = v_next_stage.id WHERE id = p_process_id;

  RETURN jsonb_build_object(
    'status', 'advanced',
    'history_id', v_history_id,
    'from_stage', v_current_stage.name,
    'to_stage', v_next_stage.name,
    'stage_order', v_next_stage.stage_order
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recriar revert_process_stage aceitando p_user_id opcional
CREATE OR REPLACE FUNCTION revert_process_stage(
  p_process_id UUID,
  p_user_id UUID DEFAULT NULL,
  p_reason TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_process resale_processes%ROWTYPE;
  v_current_stage flow_stages%ROWTYPE;
  v_prev_stage flow_stages%ROWTYPE;
  v_resolved_user_id UUID;
  v_history_id UUID;
BEGIN
  v_resolved_user_id := COALESCE(p_user_id, current_app_user_id());

  SELECT * INTO v_process FROM resale_processes WHERE id = p_process_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Processo não encontrado';
  END IF;

  SELECT * INTO v_current_stage FROM flow_stages WHERE id = v_process.current_stage_id;

  IF v_current_stage.stage_order <= 1 THEN
    RAISE EXCEPTION 'Já está na primeira etapa';
  END IF;

  SELECT * INTO v_prev_stage FROM flow_stages
  WHERE flow_type_id = v_process.flow_type_id
    AND stage_order = v_current_stage.stage_order - 1
    AND is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Etapa anterior não encontrada';
  END IF;

  INSERT INTO process_stage_history (process_id, from_stage_id, to_stage_id, changed_by, reason, notes)
  VALUES (p_process_id, v_current_stage.id, v_prev_stage.id, v_resolved_user_id, p_reason, 'Retorno de etapa')
  RETURNING id INTO v_history_id;

  UPDATE resale_processes SET
    current_stage_id = v_prev_stage.id,
    status = 'active',
    completed_at = NULL
  WHERE id = p_process_id;

  RETURN jsonb_build_object(
    'status', 'reverted',
    'history_id', v_history_id,
    'from_stage', v_current_stage.name,
    'to_stage', v_prev_stage.name,
    'stage_order', v_prev_stage.stage_order
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
