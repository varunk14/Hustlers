'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Message, MessageWithUser, CreateMessageInput, UpdateMessageInput } from '@/types/message'
import { useAuth } from '@/contexts/AuthContext'
import { RealtimePostgresChangesPayload, RealtimeChannel } from '@supabase/supabase-js'

export function useMessages(channelId: string | null, conversationId: string | null = null) {
  const [messages, setMessages] = useState<MessageWithUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const { user } = useAuth()
  const supabase = createClient()
  const subscriptionRef = useRef<RealtimeChannel | null>(null)

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
    console.log('🔵 sendMessage called', { channelId, conversationId, user: user?.id, content: input.content })
    
    if ((!channelId && !conversationId) || !user) {
      console.warn('❌ Missing channel/conversation or user', { channelId, conversationId, hasUser: !!user })
      return { error: 'You must be logged in to send a message' }
    }

    if (!input.content.trim()) {
      console.warn('❌ Empty message content')
      return { error: 'Message cannot be empty' }
    }

    try {
      setSending(true)
      setError(null)

      const messageData: { user_id: string; content: string; channel_id?: string; conversation_id?: string } = {
        user_id: user.id,
        content: input.content.trim(),
      }

      if (channelId) {
        messageData.channel_id = channelId
      } else if (conversationId) {
        messageData.conversation_id = conversationId
      }

      console.log('📤 Attempting to send message:', messageData)
      
      // Check session before sending
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      console.log('🔐 Current session:', { 
        hasSession: !!session, 
        userId: session?.user?.id,
        sessionError: sessionError?.message 
      })

      const { data: message, error: sendError } = await supabase
        .from('messages')
        .insert(messageData)
        .select()
        .single()

      console.log('📥 Insert response:', { 
        hasData: !!message, 
        hasError: !!sendError,
        error: sendError ? {
          message: sendError.message,
          code: sendError.code,
          details: sendError.details,
          hint: sendError.hint,
          full: sendError
        } : null
      })

      if (sendError) {
        // Log full error details
        console.error('❌ Error sending message - Full details:', {
          code: sendError.code,
          message: sendError.message,
          details: sendError.details,
          hint: sendError.hint,
          fullError: JSON.stringify(sendError, null, 2)
        })
        
        // Provide more detailed error message
        let errorMessage = 'Failed to send message'
        
        if (sendError.code === '42501') {
          errorMessage = 'Permission denied. You may not have access to send messages in this channel.'
        } else if (sendError.code === '23503') {
          errorMessage = 'Invalid channel or conversation. Please refresh and try again.'
        } else if (sendError.code === 'PGRST116') {
          errorMessage = 'No rows returned. Check if the channel exists and you have permission.'
        } else if (sendError.message) {
          errorMessage = sendError.message
          // Include code if available
          if (sendError.code) {
            errorMessage = `[${sendError.code}] ${sendError.message}`
          }
        } else if (sendError.code) {
          errorMessage = `Error (${sendError.code}): ${sendError.hint || 'Please try again'}`
        }
        
        // Also log to window for visibility
        if (typeof window !== 'undefined') {
          window.console.error('MESSAGE SEND ERROR:', errorMessage, sendError)
        }
        
        throw new Error(errorMessage)
      }

      console.log('✅ Message sent successfully:', message)
      // The real-time subscription will handle adding it to the list
      return { data: message, error: null }
    } catch (err) {
      console.error('❌ Exception in sendMessage:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message'
      
      // Log to window for visibility
      if (typeof window !== 'undefined') {
        window.console.error('MESSAGE SEND EXCEPTION:', errorMessage, err)
      }
      
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

