'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Message, MessageWithUser, CreateMessageInput, UpdateMessageInput } from '@/types/message'
import { useAuth } from '@/contexts/AuthContext'
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js'

export function useMessages(channelId: string | null, conversationId: string | null = null) {
  const [messages, setMessages] = useState<MessageWithUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const { user } = useAuth()
  const supabase = createClient()
  const subscriptionRef = useRef<any>(null)

  const fetchMessages = useCallback(async () => {
    if ((!channelId && !conversationId) || !user) {
      setLoading(false)
      setMessages([])
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Build query based on channel or conversation
      let query = supabase.from('messages').select('*')

      if (channelId) {
        query = query.eq('channel_id', channelId)
      } else if (conversationId) {
        query = query.eq('conversation_id', conversationId)
      }

      // Fetch messages
      const { data: messagesData, error: fetchError } = await query
        .order('created_at', { ascending: true })
        .limit(100) // Load last 100 messages

      if (fetchError) throw fetchError

      // Fetch user profiles for all unique user IDs
      const userIds = [...new Set(messagesData?.map((m) => m.user_id) || [])]
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .in('id', userIds)

      // Create a map of user profiles
      const profilesMap = new Map(
        profilesData?.map((p) => [p.id, p]) || []
      )

      // Transform the data to match MessageWithUser interface
      const messagesWithUsers: MessageWithUser[] =
        messagesData?.map((msg) => {
          const profile = profilesMap.get(msg.user_id)
          return {
            ...msg,
            user: {
              id: profile?.id || msg.user_id,
              display_name: profile?.display_name || null,
              avatar_url: profile?.avatar_url || null,
            },
          }
        }) || []

      setMessages(messagesWithUsers)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [channelId, conversationId, user, supabase])

  // Set up real-time subscription
  useEffect(() => {
    if ((!channelId && !conversationId) || !user) {
      // Clean up subscription if channel/conversation changes
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe()
        subscriptionRef.current = null
      }
      return
    }

    const filterKey = channelId ? 'channel_id' : 'conversation_id'
    const filterValue = channelId || conversationId
    const channelName = channelId ? `messages:channel:${channelId}` : `messages:conversation:${conversationId}`

    // Subscribe to new messages
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `${filterKey}=eq.${filterValue}`,
        },
        async (payload: RealtimePostgresChangesPayload<Message>) => {
          if (payload.eventType === 'INSERT' && payload.new) {
            // Fetch user profile for new message
            const { data: profile } = await supabase
              .from('profiles')
              .select('id, display_name, avatar_url')
              .eq('id', payload.new.user_id)
              .single()

            const newMessage: MessageWithUser = {
              ...payload.new,
              user: {
                id: profile?.id || payload.new.user_id,
                display_name: profile?.display_name || null,
                avatar_url: profile?.avatar_url || null,
              },
            }

            setMessages((prev) => {
              // Avoid duplicates
              if (prev.some((m) => m.id === newMessage.id)) {
                return prev
              }
              return [...prev, newMessage]
            })
          } else if (payload.eventType === 'UPDATE' && payload.new) {
            setMessages((prev) =>
              prev.map((msg) => (msg.id === payload.new.id ? { ...msg, ...payload.new } : msg))
            )
          } else if (payload.eventType === 'DELETE' && payload.old) {
            setMessages((prev) => prev.filter((msg) => msg.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    subscriptionRef.current = channel

    // Initial fetch
    fetchMessages()

    // Cleanup on unmount or channel change
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe()
        subscriptionRef.current = null
      }
    }
  }, [channelId, conversationId, user, supabase, fetchMessages])

  const sendMessage = async (input: CreateMessageInput) => {
    if ((!channelId && !conversationId) || !user) return { error: 'You must be logged in to send a message' }

    if (!input.content.trim()) {
      return { error: 'Message cannot be empty' }
    }

    try {
      setSending(true)
      setError(null)

      const messageData: any = {
        user_id: user.id,
        content: input.content.trim(),
      }

      if (channelId) {
        messageData.channel_id = channelId
      } else if (conversationId) {
        messageData.conversation_id = conversationId
      }

      const { data: message, error: sendError } = await supabase
        .from('messages')
        .insert(messageData)
        .select()
        .single()

      if (sendError) throw sendError

      // The real-time subscription will handle adding it to the list
      return { data: message, error: null }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message'
      setError(errorMessage)
      return { error: errorMessage }
    } finally {
      setSending(false)
    }
  }

  const updateMessage = async (messageId: string, input: UpdateMessageInput) => {
    if (!user) return { error: 'You must be logged in to update a message' }

    if (!input.content.trim()) {
      return { error: 'Message cannot be empty' }
    }

    try {
      setError(null)

      const { data: message, error: updateError } = await supabase
        .from('messages')
        .update({
          content: input.content.trim(),
        })
        .eq('id', messageId)
        .eq('user_id', user.id) // Ensure user owns the message
        .select()
        .single()

      if (updateError) throw updateError

      // The real-time subscription will handle updating it in the list
      return { data: message, error: null }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update message'
      setError(errorMessage)
      return { error: errorMessage }
    }
  }

  const deleteMessage = async (messageId: string) => {
    if (!user) return { error: 'You must be logged in to delete a message' }

    try {
      setError(null)

      const { error: deleteError } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId)
        .eq('user_id', user.id) // Ensure user owns the message

      if (deleteError) throw deleteError

      // The real-time subscription will handle removing it from the list
      return { error: null }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete message'
      setError(errorMessage)
      return { error: errorMessage }
    }
  }

  return {
    messages,
    loading,
    error,
    sending,
    sendMessage,
    updateMessage,
    deleteMessage,
    refetch: fetchMessages,
  }
}

