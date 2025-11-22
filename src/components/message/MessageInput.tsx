'use client'

import {
  Box,
  HStack,
  Textarea,
  IconButton,
  useColorModeValue,
  useToast,
} from '@chakra-ui/react'
import { ArrowUpIcon } from '@chakra-ui/icons'
import { useState, KeyboardEvent } from 'react'
import { CreateMessageInput } from '@/types/message'

interface MessageInputProps {
  onSend: (input: CreateMessageInput) => Promise<{ error?: string }>
  sending?: boolean
  placeholder?: string
}

export function MessageInput({ onSend, sending = false, placeholder = 'Type a message...' }: MessageInputProps) {
  const [content, setContent] = useState('')
  const toast = useToast()

  const bg = useColorModeValue('white', 'gray.800')
  const borderColor = useColorModeValue('gray.200', 'gray.700')

  const handleSend = async () => {
    if (!content.trim() || sending) return

    const result = await onSend({ content })
    if (result.error) {
      toast({
        title: 'Error sending message',
        description: result.error,
        status: 'error',
        duration: 5000,
      })
    } else {
      setContent('')
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <Box
      px={4}
      py={3}
      bg={bg}
      borderTop="1px"
      borderColor={borderColor}
    >
      <HStack spacing={2} align="end">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          resize="none"
          rows={1}
          minH="40px"
          maxH="200px"
          disabled={sending}
          _focus={{
            boxShadow: 'none',
            borderColor: 'brand.500',
          }}
        />
        <IconButton
          aria-label="Send message"
          icon={<ArrowUpIcon />}
          colorScheme="brand"
          onClick={handleSend}
          isLoading={sending}
          isDisabled={!content.trim() || sending}
          size="md"
        />
      </HStack>
    </Box>
  )
}

