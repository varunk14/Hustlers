'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Profile } from '@/types/profile'

export function useProfile(userId?: string) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }

    fetchProfile(userId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  const fetchProfile = async (id: string) => {
    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single()

      if (fetchError) {
        // If profile doesn't exist, create it
        if (fetchError.code === 'PGRST116') {
          const { data: newProfile, error: createError } = await supabase
            .from('profiles')
            .insert({ id })
            .select()
            .single()

          if (createError) {
            setError(createError.message)
          } else {
            setProfile(newProfile)
          }
        } else {
          setError(fetchError.message)
        }
      } else {
        setProfile(data)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!userId) return { error: 'No user ID provided' }

    try {
      setError(null)

      const { data, error: updateError } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single()

      if (updateError) {
        setError(updateError.message)
        return { error: updateError.message }
      }

      setProfile(data)
      return { data, error: null }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred'
      setError(errorMessage)
      return { error: errorMessage }
    }
  }

  return {
    profile,
    loading,
    error,
    updateProfile,
    refetch: () => userId && fetchProfile(userId),
  }
}

