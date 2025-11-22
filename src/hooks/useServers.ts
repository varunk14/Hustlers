'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ServerWithMember, CreateServerInput } from '@/types/server'
import { useAuth } from '@/contexts/AuthContext'

export function useServers() {
  const [servers, setServers] = useState<ServerWithMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()
  const supabase = createClient()

  const fetchServers = useCallback(async () => {
    if (!user) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Fetch public servers
      const { data: publicServers, error: publicError } = await supabase
        .from('servers')
        .select('*')
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(50)

      if (publicError) throw publicError

      // If user is logged in, fetch their memberships and add member info
      if (user) {
        const { data: memberships, error: membersError } = await supabase
          .from('server_members')
          .select('*')
          .eq('user_id', user.id)

        if (!membersError && memberships) {
          const membershipMap = new Map(memberships.map((m) => [m.server_id, m]))

          // Add member info to servers
          const serversWithMembers = (publicServers || []).map((server) => ({
            ...server,
            member: membershipMap.get(server.id),
          }))

          // Also fetch member counts
          const serverIds = serversWithMembers.map((s) => s.id)
          if (serverIds.length > 0) {
            const { data: counts } = await supabase
              .from('server_members')
              .select('server_id')
              .in('server_id', serverIds)

            const countMap = new Map<string, number>()
            counts?.forEach((c) => {
              countMap.set(c.server_id, (countMap.get(c.server_id) || 0) + 1)
            })

            serversWithMembers.forEach((server) => {
              server.member_count = countMap.get(server.id) || 0
            })
          }

          setServers(serversWithMembers)
        } else {
          setServers((publicServers || []).map((s) => ({ ...s })))
        }
      } else {
        setServers((publicServers || []).map((s) => ({ ...s })))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [user, supabase])

  useEffect(() => {
    fetchServers()
  }, [fetchServers])


  const createServer = async (input: CreateServerInput) => {
    if (!user) return { error: 'You must be logged in to create a server' }

    try {
      setError(null)

      // Create server
      const { data: server, error: serverError } = await supabase
        .from('servers')
        .insert({
          name: input.name,
          description: input.description || null,
          icon_url: input.icon_url || null,
          owner_id: user.id,
          is_public: input.is_public ?? true,
        })
        .select()
        .single()

      if (serverError) throw serverError

      // Create owner membership
      const { error: memberError } = await supabase.from('server_members').insert({
        server_id: server.id,
        user_id: user.id,
        role: 'owner',
      })

      if (memberError) throw memberError

      await fetchServers()
      return { data: server, error: null }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create server'
      setError(errorMessage)
      return { error: errorMessage }
    }
  }

  const joinServer = async (serverId: string) => {
    if (!user) return { error: 'You must be logged in to join a server' }

    try {
      setError(null)

      const { error: joinError } = await supabase.from('server_members').insert({
        server_id: serverId,
        user_id: user.id,
        role: 'member',
      })

      if (joinError) throw joinError

      await fetchServers()
      return { error: null }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to join server'
      setError(errorMessage)
      return { error: errorMessage }
    }
  }

  const leaveServer = async (serverId: string) => {
    if (!user) return { error: 'You must be logged in to leave a server' }

    try {
      setError(null)

      const { error: leaveError } = await supabase
        .from('server_members')
        .delete()
        .eq('server_id', serverId)
        .eq('user_id', user.id)

      if (leaveError) throw leaveError

      await fetchServers()
      return { error: null }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to leave server'
      setError(errorMessage)
      return { error: errorMessage }
    }
  }

  return {
    servers,
    loading,
    error,
    createServer,
    joinServer,
    leaveServer,
    refetch: fetchServers,
  }
}

