import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'

// undefined while the stored session is being read
export function useSession() {
  const [session, setSession] = useState<Session | null | undefined>(supabase ? undefined : null)
  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])
  return session
}

const messages: Record<string, string> = {
  invalid_credentials: 'E-mail ou mot de passe incorrect.',
  user_already_exists: 'Un compte existe déjà avec cet e-mail. Connecte-toi plutôt.',
  email_exists: 'Un compte existe déjà avec cet e-mail. Connecte-toi plutôt.',
  weak_password: 'Mot de passe trop faible : 8 caractères minimum.',
  validation_failed: 'Vérifie l’adresse e-mail.',
  email_address_invalid: 'Cette adresse e-mail n’est pas valide.',
  over_request_rate_limit: 'Trop d’essais, réessaie dans une minute.',
  email_not_confirmed: 'Confirme d’abord ton adresse e-mail.',
}

export const authMessage = (e: { code?: string; message: string }) =>
  (e.code && messages[e.code]) || (navigator.onLine ? 'Ça n’a pas marché, réessaie.' : 'Pas de connexion internet.')
