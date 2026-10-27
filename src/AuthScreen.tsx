import { useState } from 'react'
import { motion } from 'framer-motion'
import { supabase } from './supabase'
import { authMessage } from './auth'
import { themes } from './themes'

export function AuthScreen() {
  const [mode, setMode] = useState<'signup' | 'signin'>('signup')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supabase || busy) return
    setBusy(true)
    setError(null)
    setInfo(null)
    const creds = { email: email.trim(), password }
    const { data, error } =
      mode === 'signup' ? await supabase.auth.signUp(creds) : await supabase.auth.signInWithPassword(creds)
    setBusy(false)
    if (error) return setError(authMessage(error))
    if (mode === 'signup' && !data.session) setInfo('Compte créé ! Confirme ton adresse via l’e-mail reçu.')
  }

  return (
    <main className="auth">
      <div className="auth-swatches" aria-hidden>
        {themes.map((t, i) => (
          <motion.i
            key={t.id}
            style={{ background: t.bg }}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * i, type: 'spring', stiffness: 300, damping: 24 }}
          />
        ))}
      </div>
      <h1 className="auth-title">Mon année</h1>
      <p className="auth-sub">Un pixel par jour, une année en couleurs.</p>

      <div className="auth-tabs" role="tablist">
        <button role="tab" aria-selected={mode === 'signup'} className={mode === 'signup' ? 'on' : ''} onClick={() => setMode('signup')}>
          Créer un compte
        </button>
        <button role="tab" aria-selected={mode === 'signin'} className={mode === 'signin' ? 'on' : ''} onClick={() => setMode('signin')}>
          Se connecter
        </button>
      </div>

      <form className="auth-form" onSubmit={submit}>
        <label className="field">
          <span>E-mail</span>
          <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="field">
          <span>Mot de passe</span>
          <input
            type="password"
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {error && <p className="auth-error">{error}</p>}
        {info && <p className="auth-info">{info}</p>}
        <button className="primary-btn auth-submit" disabled={busy}>
          {busy ? '…' : mode === 'signup' ? 'Créer mon compte' : 'Me connecter'}
        </button>
      </form>
      <p className="auth-note">Tes données restent privées : personne d’autre n’y a accès.</p>
    </main>
  )
}
