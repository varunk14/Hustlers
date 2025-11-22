'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Server, ServerMember } from '@/types/server'
import { useAuth } from '@/contexts/AuthContext'

export interface UserServer extends Server {
  member: ServerMember
}

export function useUserServers() {
  const [servers, setServers] = useState<UserServer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()
  const supabase = createClient()

  const fetchUserServers = useCallback(async () => {
    if (!user) {
      setLoading(false)
      setServers([])
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Fetch user's memberships
      const { data: memberships, error: membersError } = await supabase
        .from('server_members')
        .select('*, server:servers(*)')
        .eq('user_id', user.id)
        .order('joined_at', { ascending: false })

      if (membersError) throw membersError

      interface MembershipWithServer {
        id: string
        server_id: string
        user_id: string
        role: 'owner' | 'admin' | 'member'
        joined_at: string
        server: Server
      }

      const userServers: UserServer[] =
        (memberships as MembershipWithServer[])?.map((m) => ({
          ...m.server,
          member: {
            id: m.id,
            server_id: m.server_id,
            user_id: m.user_id,
            role: m.role,
            joined_at: m.joined_at,
          },
        })) || []

      setServers(userServers)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [user, supabase])

  useEffect(() => {
    fetchUserServers()
  }, [fetchUserServers])

  return {
    servers,
    loading,
    error,
    refetch: fetchUserServers,
  }
}

