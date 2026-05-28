import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/features/auth/hooks/useAuth'
import Input from '@/shared/components/Input'
import Button from '@/shared/components/Button'
import { ROUTES } from '@/shared/constants'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { handleSignIn, isLoading, error } = useAuth()

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    await handleSignIn(email, password)
  }

  return (
    <div className="min-h-screen bg-bg-base flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo / título */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-text-primary tracking-tight">Correlativa</h1>
          <p className="mt-2 text-text-secondary text-sm">Tu carrera, organizada.</p>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          {/* Error de auth */}
          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <Input
            label="Email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="vos@email.com"
            required
          />

          <Input
            label="Contraseña"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />

          <Button type="submit" loading={isLoading} className="mt-2 w-full">
            Entrar
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-text-secondary">
          ¿No tenés cuenta?{' '}
          <Link to={ROUTES.REGISTER} className="text-accent hover:underline font-medium">
            Registrate
          </Link>
        </p>
      </div>
    </div>
  )
}
