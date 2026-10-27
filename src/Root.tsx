import { supabase } from './supabase'
import { useSession } from './auth'
import { AuthScreen } from './AuthScreen'
import App from './App'

export function Root() {
  const session = useSession()
  if (!supabase) return <App user={null} />
  if (session === undefined) return null
  if (!session) return <AuthScreen />
  // keyed so switching accounts starts from a clean store
  return <App key={session.user.id} user={{ id: session.user.id, email: session.user.email ?? '' }} />
}
