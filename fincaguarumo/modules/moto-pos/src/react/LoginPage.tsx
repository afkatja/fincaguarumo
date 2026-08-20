import React, { useState, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Button, Input, Card, CardContent, CardHeader, CardTitle, StatusAlert } from './primitives'
import { useStrings } from '../strings'
import './LoginPage.css'

export interface LoginPageProps {
  supabaseUrl?: string
  supabaseAnonKey?: string
  onLogin?: (user: { id: string; email?: string; isAdmin: boolean }) => void
  className?: string
}

export function LoginPage({
  supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  onLogin,
  className = '',
}: LoginPageProps) {
  const { t } = useStrings()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [alert, setAlert] = useState<{ variant: 'error' | 'success' | 'warning'; title: string; message: string } | null>(null)
  const [supabase] = useState(() => createClient(supabaseUrl, supabaseAnonKey))

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setAlert(null)
    setLoading(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })

      if (error) {
        throw error
      }

      if (data.user) {
        const isAdmin = data.user.app_metadata?.role === 'admin' ||
          (Array.isArray(data.user.app_metadata?.roles) && data.user.app_metadata.roles.includes('admin'))

        setAlert({
          variant: 'success',
          title: t('login.success'),
          message: t('login.welcome', { email: data.user.email || '' }),
        })
        onLogin?.({ id: data.user.id, email: data.user.email, isAdmin })
      }
    } catch (error: unknown) {
      const err = error as { message?: string }
      setAlert({
        variant: 'error',
        title: t('login.error'),
        message: err.message || t('login.failed'),
      })
    } finally {
      setLoading(false)
    }
  }, [email, password, supabase, onLogin, t])

  const dismissAlert = useCallback(() => setAlert(null), [])

  if (!supabaseUrl || !supabaseAnonKey) {
    return (
      <Card variant="default" padding="md" className={`moto-pos-login-page ${className}`}>
        <CardHeader>
          <CardTitle>{t('login.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <StatusAlert
            variant="warning"
            title={t('login.configMissing')}
            message={t('login.configMissingMessage')}
          />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card variant="default" padding="md" className={`moto-pos-login-page ${className}`}>
      <CardHeader>
        <CardTitle>{t('login.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="moto-pos-login-form">
          {alert && (
            <StatusAlert
              variant={alert.variant}
              title={alert.title}
              message={alert.message}
              dismissible
              onDismiss={dismissAlert}
              className="moto-pos-login-alert"
            />
          )}

          <Input
            label={t('login.emailLabel')}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('login.emailPlaceholder')}
            autoComplete="email"
            disabled={loading}
          />

          <Input
            label={t('login.passwordLabel')}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t('login.passwordPlaceholder')}
            autoComplete="current-password"
            disabled={loading}
          />

          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            loading={loading}
          >
            {loading ? t('login.signingIn') : t('login.signInButton')}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}