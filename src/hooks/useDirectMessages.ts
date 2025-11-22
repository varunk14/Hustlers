'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  DirectMessageWithParticipants,
  CreateDirectMessageInput,
  UpdateDirectMessageInput,
} from '@/types/direct-message'
import { useAuth } from '@/contexts/AuthContext'

export function useDirectMessages() {
  const [conversations, setConversations] = useState<DirectMessageWithParticipants[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()
  const supabase = createClient()

  const fetchConversations = useCallback(async () => {
    if (!user) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Fetch conversations user is part of
      const { data: participants, error: participantsError } = await supabase
        .from('direct_message_participants')
        .select('conversation_id')
        .eq('user_id', user.id)

      if (participantsError) throw participantsError

      const conversationIds = participants?.map((p) => p.conversation_id) || []

      if (conversationIds.length === 0) {
        setConversations([])
        setLoading(false)
        return
      }

      // Fetch conversation details
      const { data: conversationsData, error: conversationsError } = await supabase
        .from('direct_messages')
        .select('*')
        .in('id', conversationIds)
        .order('updated_at', { ascending: false })

      if (conversationsError) throw conversationsError

      // Fetch participants for each conversation
      const { data: allParticipants, error: allParticipantsError } = await supabase
        .from('direct_message_participants')
        .select('*')
        .in('conversation_id', conversationIds)

      if (allParticipantsError) throw allParticipantsError

      // Fetch user profiles for all participants
      const userIds = [...new Set(allParticipants?.map((p) => p.user_id) || [])]
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .in('id', userIds)

      const profilesMap = new Map(profiles?.map((p) => [p.id, p]) || [])

      // Fetch last message for each conversation
      const { data: lastMessages } = await supabase
        .from('messages')
        .select('id, content, created_at, user_id, conversation_id')
        .in('conversation_id', conversationIds)
        .order('created_at', { ascending: false })

      // Group last messages by conversation
      const lastMessagesMap = new Map<string, typeof lastMessages[0]>()
      lastMessages?.forEach((msg) => {
        if (msg.conversation_id && !lastMessagesMap.has(msg.conversation_id)) {
          lastMessagesMap.set(msg.conversation_id, msg)
        }
      })

      // Build conversations with participants
      const conversationsWithParticipants: DirectMessageWithParticipants[] =
        conversationsData?.map((conv) => {
          const convParticipants = allParticipants?.filter((p) => p.conversation_id === conv.id) || []

          return {
            ...conv,
            participants: convParticipants.map((p) => ({
              id: p.id,
              user_id: p.user_id,
              user: {
                id: profilesMap.get(p.user_id)?.id || p.user_id,
                display_name: profilesMap.get(p.user_id)?.display_name || null,
                avatar_url: profilesMap.get(p.user_id)?.avatar_url || null,
              },
            })),
            last_message: lastMessagesMap.get(conv.id) || undefined,
          }
        }) || []

      setConversations(conversationsWithParticipants)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [user, supabase])

  useEffect(() => {
    fetchConversations()
  }, [fetchConversations])

  const createConversation = async (input: CreateDirectMessageInput) => {
    if (!user) return { error: 'You must be logged in to create a conversation' }

    try {
      setError(null)

      // Determine conversation type
      const type = input.type || (input.participant_ids.length === 1 ? 'direct' : 'group')

      // For direct messages, check if conversation already exists
      if (type === 'direct' && input.participant_ids.length === 1) {
        const otherUserId = input.participant_ids[0]

        // Check for existing direct conversation
        const { data: existingParticipants } = await supabase
          .from('direct_message_participants')
          .select('conversation_id')
          .eq('user_id', user.id)

        if (existingParticipants) {
          const conversationIds = existingParticipants.map((p) => p.conversation_id)

          const { data: existingConvs } = await supabase
            .from('direct_messages')
            .select('id, type')
            .in('id', conversationIds)
            .eq('type', 'direct')

          if (existingConvs) {
            for (const conv of existingConvs) {
              const { data: otherParticipants } = await supabase
                .from('direct_message_participants')
                .select('user_id')
                .eq('conversation_id', conv.id)
                .eq('user_id', otherUserId)

              if (otherParticipants && otherParticipants.length > 0) {
                // Conversation already exists
                await fetchConversations()
                return { data: { id: conv.id }, error: null }
              }
            }
          }
        }
      }

      // Create new conversation
      const { data: conversation, error: createError } = await supabase
        .from('direct_messages')
        .insert({
          name: input.name || null,
          type,
        })
        .select()
        .single()

      if (createError) throw createError

      // Add current user as participant
      await supabase.from('direct_message_participants').insert({
        conversation_id: conversation.id,
        user_id: user.id,
      })

      // Add other participants
      if (input.participant_ids.length > 0) {
        await supabase.from('direct_message_participants').insert(
          input.participant_ids.map((userId) => ({
            conversation_id: conversation.id,
            user_id: userId,
          }))
        )
      }

      await fetchConversations()
      return { data: conversation, error: null }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create conversation'
      setError(errorMessage)
      return { error: errorMessage }
    }
  }

  const updateConversation = async (conversationId: string, input: UpdateDirectMessageInput) => {
    if (!user) return { error: 'You must be logged in to update a conversation' }

    try {
      setError(null)

      const { data: conversation, error: updateError } = await supabase
        .from('direct_messages')
        .update({
          ...(input.name !== undefined && { name: input.name || null }),
        })
        .eq('id', conversationId)
        .select()
        .single()

      if (updateError) throw updateError

      await fetchConversations()
      return { data: conversation, error: null }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update conversation'
      setError(errorMessage)
      return { error: errorMessage }
    }
  }

  const leaveConversation = async (conversationId: string) => {
    if (!user) return { error: 'You must be logged in to leave a conversation' }

    try {
      setError(null)

      const { error: deleteError } = await supabase
        .from('direct_message_participants')
        .delete()
        .eq('conversation_id', conversationId)
        .eq('user_id', user.id)

      if (deleteError) throw deleteError

      await fetchConversations()
      return { error: null }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to leave conversation'
      setError(errorMessage)
      return { error: errorMessage }
    }
  }

  return {
    conversations,
    loading,
    error,
    createConversation,
    updateConversation,
    leaveConversation,
    refetch: fetchConversations,
  }
}

