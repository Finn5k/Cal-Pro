import { supabase } from './supabase'
import type { User } from '@/types'

export interface AuthResponse {
  success: boolean
  error?: string
  user?: User
}

/**
 * Sign up a new user
 */
export async function signUp(
  email: string,
  password: string,
  dailyCaloricGoal: number = 2000,
  dailyProteinGoal: number = 160
): Promise<AuthResponse> {
  try {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (authError) {
      return { success: false, error: authError.message }
    }

    if (!authData.user?.id) {
      return { success: false, error: 'Failed to create user' }
    }

    // Create user profile
    const { data, error } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email,
        daily_calorie_goal: dailyCaloricGoal,
        daily_protein_goal: dailyProteinGoal,
      })
      .select()
      .single()

    if (error) {
      // Clean up auth user if profile creation fails
      await supabase.auth.admin.deleteUser(authData.user.id).catch(() => null)
      return { success: false, error: `Failed to create profile: ${error.message}` }
    }

    return { success: true, user: data }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Sign in with email and password
 */
export async function signIn(email: string, password: string): Promise<AuthResponse> {
  try {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      return { success: false, error: authError.message }
    }

    if (!authData.user?.id) {
      return { success: false, error: 'Failed to sign in' }
    }

    // Fetch user profile
    const { data, error } = await supabase
      .from('users')
      .select()
      .eq('id', authData.user.id)
      .single()

    if (error) {
      return { success: false, error: `Failed to fetch profile: ${error.message}` }
    }

    return { success: true, user: data }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Sign out current user
 */
export async function signOut(): Promise<AuthResponse> {
  try {
    const { error } = await supabase.auth.signOut()

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Get current user
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      return null
    }

    const { data, error } = await supabase
      .from('users')
      .select()
      .eq('id', authUser.id)
      .single()

    if (error) {
      console.error('Failed to fetch current user profile:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error getting current user:', error)
    return null
  }
}

/**
 * Reset password
 */
export async function resetPassword(email: string): Promise<AuthResponse> {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Update user profile
 */
export async function updateUserProfile(
  userId: string,
  updates: Partial<User>
): Promise<AuthResponse> {
  try {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, user: data }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Listen to auth state changes
 */
export function onAuthStateChange(
  callback: (user: User | null) => void
): (() => void) | undefined {
  try {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session?.user) {
        callback(null)
        return
      }

      const user = await getCurrentUser()
      callback(user)
    })

    return () => {
      subscription?.unsubscribe()
    }
  } catch (error) {
    console.error('Error setting up auth state listener:', error)
    return undefined
  }
}
