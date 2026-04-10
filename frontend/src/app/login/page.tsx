'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Building2, Eye, EyeOff, Mail, Lock, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signIn(email, password);
      router.push('/dashboard');
    } catch {
      setError('E-mail ou senha inválidos');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-primary-950">
      {/* Left - Branding */}
      <div className="relative hidden w-[55%] flex-col justify-between overflow-hidden p-14 lg:flex">
        {/* Background effects */}
        <div className="pointer-events-none absolute inset-0">
          {/* Gradient orbs */}
          <div className="absolute -left-32 -top-32 h-[500px] w-[500px] rounded-full bg-primary-600/15 blur-[120px]" />
          <div className="absolute -bottom-40 -right-20 h-[400px] w-[400px] rounded-full bg-accent-500/10 blur-[100px]" />
          <div className="absolute left-1/2 top-1/2 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary-400/5 blur-[80px]" />

          {/* Grid pattern */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
              backgroundSize: '60px 60px',
            }}
          />

          {/* Diagonal accent line */}
          <div className="absolute -right-20 top-1/4 h-px w-[600px] rotate-[30deg] bg-gradient-to-r from-transparent via-primary-400/20 to-transparent" />
          <div className="absolute -left-10 bottom-1/3 h-px w-[500px] rotate-[30deg] bg-gradient-to-r from-transparent via-accent-400/15 to-transparent" />
        </div>

        {/* Logo */}
        <div className="relative flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 shadow-lg shadow-primary-500/25">
            <Building2 className="h-6 w-6 text-white" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-white">
            LYX
          </span>
        </div>

        {/* Main headline */}
        <div className="relative">
          <h2 className="text-5xl font-bold leading-[1.15] tracking-tight text-white">
            Gestão completa
            <br />
            de{' '}
            <span className="bg-gradient-to-r from-primary-400 to-primary-300 bg-clip-text text-transparent">
              revendas
            </span>
            <br />
            <span className="bg-gradient-to-r from-accent-400 to-accent-300 bg-clip-text text-transparent">
              imobiliárias
            </span>
          </h2>

          {/* Stat indicators */}
          <div className="mt-12 flex gap-8">
            <div className="group">
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-white">24</span>
                <span className="text-sm font-medium text-primary-400">etapas</span>
              </div>
              <p className="mt-1 text-xs text-slate-500">Fluxo padrão</p>
            </div>
            <div className="h-12 w-px bg-slate-700/50" />
            <div className="group">
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-white">100%</span>
                <span className="text-sm font-medium text-accent-400">controle</span>
              </div>
              <p className="mt-1 text-xs text-slate-500">Pipeline completo</p>
            </div>
            <div className="h-12 w-px bg-slate-700/50" />
            <div className="group">
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-white">Real</span>
                <span className="text-sm font-medium text-emerald-400">time</span>
              </div>
              <p className="mt-1 text-xs text-slate-500">Dashboard ao vivo</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="relative text-xs text-slate-600">
          &copy; {new Date().getFullYear()} LYX. Todos os direitos reservados.
        </p>
      </div>

      {/* Right - Form */}
      <div className="flex w-full items-center justify-center px-6 lg:w-[45%]">
        <div className="w-full max-w-[420px]">
          {/* Mobile logo */}
          <div className="mb-10 flex items-center gap-3 lg:hidden">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 shadow-lg shadow-primary-500/25">
              <Building2 className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-white">
              LYX
            </span>
          </div>

          {/* Card */}
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-8 shadow-2xl shadow-black/20 backdrop-blur-xl sm:p-10">
            <div className="mb-8">
              <h1 className="text-2xl font-bold tracking-tight text-white">
                Bem-vindo de volta
              </h1>
              <p className="mt-2 text-sm text-slate-400">
                Acesse sua conta para continuar
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email */}
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  E-mail
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2">
                    <Mail className="h-4 w-4 text-slate-500" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] py-3 pl-11 pr-4 text-sm text-white transition-all duration-200 placeholder:text-slate-600 hover:border-white/[0.12] focus:border-primary-500/50 focus:bg-white/[0.06] focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                    placeholder="seu@email.com"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Senha
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2">
                    <Lock className="h-4 w-4 text-slate-500" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] py-3 pl-11 pr-11 text-sm text-white transition-all duration-200 placeholder:text-slate-600 hover:border-white/[0.12] focus:border-primary-500/50 focus:bg-white/[0.06] focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded-md p-0.5 text-slate-500 transition-colors hover:text-slate-300"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2.5 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                  <div className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-red-400" />
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="group relative mt-2 w-full overflow-hidden rounded-xl bg-gradient-to-r from-accent-600 to-accent-500 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-accent-500/25 transition-all duration-300 hover:shadow-xl hover:shadow-accent-500/30 hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 disabled:opacity-50 disabled:shadow-none"
              >
                {/* Shine effect on hover */}
                <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-700 group-hover:translate-x-full" />

                {loading ? (
                  <span className="relative inline-flex items-center justify-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Entrando...
                  </span>
                ) : (
                  <span className="relative inline-flex items-center justify-center gap-2">
                    Entrar
                    <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                  </span>
                )}
              </button>
            </form>
          </div>

          {/* Mobile footer */}
          <p className="mt-8 text-center text-xs text-slate-600 lg:hidden">
            &copy; {new Date().getFullYear()} LYX. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </div>
  );
}
