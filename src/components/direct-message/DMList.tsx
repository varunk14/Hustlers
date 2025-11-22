'use client'

import {
  Box,
  VStack,
  HStack,
  Text,
  Avatar,
  AvatarGroup,
  useColorModeValue,
  Spinner,
  Center,
} from '@chakra-ui/react'
import { DirectMessageWithParticipants } from '@/types/direct-message'
import { formatDistanceToNow } from 'date-fns'

interface DMListProps {
  conversations: DirectMessageWithParticipants[]
  loading?: boolean
  selectedConversationId?: string | null
  onConversationClick?: (conversationId: string) => void
}

export function DMList({
  conversations,
  loading,
  selectedConversationId,
  onConversationClick,
  currentUserId,
}: DMListProps) {
  const hoverBg = useColorModeValue('gray.100', 'gray.700')
  const selectedBg = useColorModeValue('blue.100', 'blue.900')
  const textColor = useColorModeValue('gray.700', 'gray.300')
  const selectedTextColor = useColorModeValue('blue.700', 'blue.200')
  const mutedColor = useColorModeValue('gray.500', 'gray.400')

  if (loading) {
    return (
      <Center py={4}>
        <Spinner size="sm" />
      </Center>
    )
  }

  if (conversations.length === 0) {
    return (
      <Box p={4}>
        <Text fontSize="sm" color={textColor} textAlign="center">
          No conversations yet. Start a new one!
        </Text>
      </Box>
    )
  }

  return (
    <VStack spacing={0} align="stretch">
      {conversations.map((conversation) => {
        const isSelected = selectedConversationId === conversation.id
        // Get other participants (excluding current user)
        const otherParticipants = currentUserId
          ? conversation.participants.filter((p) => p.user_id !== currentUserId)
          : conversation.participants.slice(1)

        // Get display name
        let displayName = conversation.name
        if (!displayName) {
          if (conversation.type === 'direct' && otherParticipants.length > 0) {
            displayName = otherParticipants[0]?.user.display_name || 'Unknown User'
          } else if (conversation.type === 'group') {
            displayName = `${conversation.participants.length} members`
          } else {
            displayName = 'Direct Message'
          }
        }

        // Get avatar(s)
        const avatars = conversation.type === 'direct' && otherParticipants.length > 0
          ? [otherParticipants[0]?.user.avatar_url].filter(Boolean)
          : conversation.participants
              .slice(0, 3)
              .map((p) => p.user.avatar_url)
              .filter(Boolean)

        const lastMessagePreview = conversation.last_message
          ? conversation.last_message.content.length > 50
            ? conversation.last_message.content.substring(0, 50) + '...'
            : conversation.last_message.content
          : 'No messages yet'

        const lastMessageTime = conversation.last_message
          ? formatDistanceToNow(new Date(conversation.last_message.created_at), { addSuffix: true })
          : null

        return (
          <Box
            key={conversation.id}
            as="button"
            w="full"
            px={3}
            py={2}
            bg={isSelected ? selectedBg : 'transparent'}
            color={isSelected ? selectedTextColor : textColor}
            _hover={{ bg: isSelected ? selectedBg : hoverBg }}
            onClick={() => onConversationClick?.(conversation.id)}
            textAlign="left"
            transition="all 0.2s"
          >
            <HStack spacing={3} align="start">
              {conversation.type === 'direct' && avatars.length > 0 ? (
                <Avatar
                  src={avatars[0] || undefined}
                  name={displayName}
                  size="sm"
                />
              ) : (
                <AvatarGroup size="sm" max={3}>
                  {avatars.map((url, idx) => (
                    <Avatar key={idx} src={url || undefined} name={displayName} />
                  ))}
                </AvatarGroup>
              )}
              <VStack align="start" spacing={0} flex={1} minW={0}>
                <HStack justify="space-between" w="full">
                  <Text fontSize="sm" fontWeight="semibold" noOfLines={1}>
                    {displayName}
                  </Text>
                  {lastMessageTime && (
                    <Text fontSize="xs" color={mutedColor}>
                      {lastMessageTime}
                    </Text>
                  )}
                </HStack>
                <Text fontSize="xs" color={mutedColor} noOfLines={1}>
                  {lastMessagePreview}
                </Text>
              </VStack>
            </HStack>
          </Box>
        )
      })}
    </VStack>
  )
}

