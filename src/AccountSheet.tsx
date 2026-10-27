import { useState } from 'react'
import { supabase } from './supabase'
import { Store } from './store'
import { Sheet } from './Sheet'

type Props = {
  email: string
  store: Store
  forget: () => Promise<void>
  onClose: () => void
}

export function AccountSheet({ email, store, forget, onClose }: Props) {
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const exportData = () => {
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), ...store }, null, 2)], {
      type: 'application/json',
    })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `mon-annee-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const signOut = async () => {
    setBusy(true)
    await forget()
    await supabase?.auth.signOut()
  }

  const deleteAccount = async () => {
    if (!supabase) return
    setBusy(true)
    const { error } = await supabase.rpc('delete_account')
    if (error) {
      setBusy(false)
      return setError('La suppression a échoué, réessaie avec une connexion internet.')
    }
    await forget()
    await supabase.auth.signOut({ scope: 'local' })
  }

  return (
    <Sheet
      onClose={onClose}
      handle={
        <>
          <p className="sheet-kicker">Mon compte</p>
          <h2 className="sheet-date account-email">{email}</h2>
        </>
      }
    >
      <div className="account-actions">
        <button className="account-row" onClick={exportData}>
          Exporter mes données <span>↓</span>
        </button>
        <button className="account-row" onClick={signOut} disabled={busy}>
          Me déconnecter <span>→</span>
        </button>
        {!confirming ? (
          <button className="account-row danger" onClick={() => setConfirming(true)}>
            Supprimer mon compte <span>×</span>
          </button>
        ) : (
          <div className="account-confirm">
            <p>Ton compte et toutes tes données seront effacés définitivement.</p>
            <div className="sheet-actions">
              <button className="ghost-btn" onClick={() => setConfirming(false)}>
                Annuler
              </button>
              <button className="primary-btn danger-btn" onClick={deleteAccount} disabled={busy}>
                Tout supprimer
              </button>
            </div>
          </div>
        )}
        {error && <p className="auth-error">{error}</p>}
      </div>
    </Sheet>
  )
}
