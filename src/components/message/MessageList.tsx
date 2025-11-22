'use client'

import { Box, VStack, Spinner, Center, Text, useColorModeValue } from '@chakra-ui/react'
import { MessageWithUser } from '@/types/message'
import { MessageItem } from './MessageItem'
import { useEffect, useRef } from 'react'

interface MessageListProps {
  messages: MessageWithUser[]
  loading?: boolean
  onEdit?: (message: MessageWithUser) => void
  onDelete?: (messageId: string) => void
}

export function MessageList({ messages, loading, onEdit, onDelete }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const bg = useColorModeValue('gray.50', 'gray.900')

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  if (loading) {
    return (
      <Center py={8}>
        <Spinner size="lg" />
      </Center>
    )
  }

  if (messages.length === 0) {
    return (
      <Center py={12}>
        <VStack spacing={2}>
          <Text fontSize="lg" color="gray.500">
            No messages yet
          </Text>
          <Text fontSize="sm" color="gray.400">
            Be the first to send a message!
          </Text>
        </VStack>
      </Center>
    )
  }

  // Group messages by user to show avatar only for first message in a group
  const groupedMessages: Array<{ message: MessageWithUser; showAvatar: boolean }> = []
  let lastUserId: string | null = null

  messages.forEach((message, index) => {
    const showAvatar = message.user_id !== lastUserId
    groupedMessages.push({ message, showAvatar })
    lastUserId = message.user_id
  })

  return (
    <Box flex={1} overflowY="auto" bg={bg} py={4}>
      <VStack spacing={0} align="stretch">
        {groupedMessages.map(({ message, showAvatar }) => (
          <MessageItem
            key={message.id}
            message={message}
            showAvatar={showAvatar}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
        <div ref={messagesEndRef} />
      </VStack>
    </Box>
  )
}

