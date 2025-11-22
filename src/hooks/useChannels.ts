'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Channel, CreateChannelInput, UpdateChannelInput } from '@/types/channel'
import { useAuth } from '@/contexts/AuthContext'

export function useChannels(serverId: string | null) {
  const [channels, setChannels] = useState<Channel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()
  const supabase = createClient()

  const fetchChannels = useCallback(async () => {
    if (!serverId || !user) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('channels')
        .select('*')
        .eq('server_id', serverId)
        .order('position', { ascending: true })
        .order('created_at', { ascending: true })

      if (fetchError) throw fetchError

      setChannels(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [serverId, user, supabase])

  useEffect(() => {
    fetchChannels()
  }, [fetchChannels])

  const createChannel = async (input: CreateChannelInput) => {
    if (!serverId || !user) return { error: 'You must be logged in to create a channel' }

    try {
      setError(null)

      // Get the highest position for this server
      const { data: existingChannels } = await supabase
        .from('channels')
        .select('position')
        .eq('server_id', serverId)
        .order('position', { ascending: false })
        .limit(1)

      const nextPosition = existingChannels && existingChannels.length > 0
        ? existingChannels[0].position + 1
        : 0

      const { data: channel, error: createError } = await supabase
        .from('channels')
        .insert({
          server_id: serverId,
          name: input.name,
          description: input.description || null,
          type: input.type || 'text',
          position: input.position ?? nextPosition,
        })
        .select()
        .single()

      if (createError) throw createError

      await fetchChannels()
      return { data: channel, error: null }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create channel'
      setError(errorMessage)
      return { error: errorMessage }
    }
  }

  const updateChannel = async (channelId: string, input: UpdateChannelInput) => {
    if (!user) return { error: 'You must be logged in to update a channel' }

    try {
      setError(null)

      const { data: channel, error: updateError } = await supabase
        .from('channels')
        .update({
          ...(input.name !== undefined && { name: input.name }),
          ...(input.description !== undefined && { description: input.description || null }),
          ...(input.type !== undefined && { type: input.type }),
          ...(input.position !== undefined && { position: input.position }),
        })
        .eq('id', channelId)
        .select()
        .single()

      if (updateError) throw updateError

      await fetchChannels()
      return { data: channel, error: null }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update channel'
      setError(errorMessage)
      return { error: errorMessage }
    }
  }

  const deleteChannel = async (channelId: string) => {
    if (!user) return { error: 'You must be logged in to delete a channel' }

    try {
      setError(null)

      const { error: deleteError } = await supabase
        .from('channels')
        .delete()
        .eq('id', channelId)

      if (deleteError) throw deleteError

      await fetchChannels()
      return { error: null }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete channel'
      setError(errorMessage)
      return { error: errorMessage }
    }
  }

  return {
    channels,
    loading,
    error,
    createChannel,
    updateChannel,
    deleteChannel,
    refetch: fetchChannels,
  }
}

