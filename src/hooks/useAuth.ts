import { useEffect, useState } from 'react'
import type { User } from '@/types'
import { getCurrentUser, onAuthStateChange } from '@/services/auth'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let unsubscribe: (() => void) | undefined

    const initAuth = async () => {
      try {
        // Get initial user
        const currentUser = await getCurrentUser()
        setUser(currentUser)

        // Subscribe to auth changes
        unsubscribe = onAuthStateChange((newUser) => {
          setUser(newUser)
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize auth')
      } finally {
        setIsLoading(false)
      }
    }

    initAuth()

    return () => {
      unsubscribe?.()
    }
  }, [])

  return { user, isLoading, error }
}
