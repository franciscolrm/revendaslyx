-- ============================================================
-- STORAGE — Bucket para importações
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('imports', 'imports', false)
ON CONFLICT (id) DO NOTHING;

-- Apenas usuários autenticados podem fazer upload
CREATE POLICY storage_imports_insert ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'imports');

-- Apenas o uploader ou admins podem ler
CREATE POLICY storage_imports_select ON storage.objects
    FOR SELECT TO authenticated
    USING (
        bucket_id = 'imports'
        AND (
            (storage.foldername(name))[2] = auth.uid()::text
            OR public.user_has_permission('imports', 'view')
        )
    );
