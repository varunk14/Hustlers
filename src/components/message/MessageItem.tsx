'use client'

import {
  Box,
  HStack,
  VStack,
  Text,
  Avatar,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  IconButton,
  useColorModeValue,
} from '@chakra-ui/react'
import { MessageWithUser } from '@/types/message'
import { EditIcon, DeleteIcon } from '@chakra-ui/icons'
import { format, formatDistanceToNow } from 'date-fns'
import { useAuth } from '@/contexts/AuthContext'
import { useState } from 'react'

interface MessageItemProps {
  message: MessageWithUser
  showAvatar?: boolean
  onEdit?: (message: MessageWithUser) => void
  onDelete?: (messageId: string) => void
}

export function MessageItem({ message, showAvatar = true, onEdit, onDelete }: MessageItemProps) {
  const { user } = useAuth()
  const [isHovered, setIsHovered] = useState(false)

  const bg = useColorModeValue('transparent', 'transparent')
  const hoverBg = useColorModeValue('gray.50', 'gray.800')
  const textColor = useColorModeValue('gray.700', 'gray.300')
  const timestampColor = useColorModeValue('gray.500', 'gray.500')
  const nameColor = useColorModeValue('gray.900', 'gray.100')

  const isOwnMessage = user?.id === message.user_id
  const canEdit = isOwnMessage && onEdit
  const canDelete = isOwnMessage && onDelete

  const displayName = message.user.display_name || 'Unknown User'
  const timeAgo = formatDistanceToNow(new Date(message.created_at), { addSuffix: true })
  const fullTime = format(new Date(message.created_at), 'PPpp')

  return (
    <Box
      px={4}
      py={2}
      bg={isHovered ? hoverBg : bg}
      _hover={{ bg: hoverBg }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      transition="background-color 0.2s"
    >
      <HStack align="start" spacing={3}>
        {showAvatar && (
          <Avatar
            src={message.user.avatar_url || undefined}
            name={displayName}
            size="sm"
            mt={1}
          />
        )}
        {!showAvatar && <Box w="32px" />}
        <VStack align="start" spacing={0} flex={1} minW={0}>
          <HStack spacing={2} align="baseline">
            <Text
              fontSize="sm"
              fontWeight="semibold"
              color={nameColor}
              _hover={{ textDecoration: 'underline', cursor: 'pointer' }}
            >
              {displayName}
            </Text>
            <Text fontSize="xs" color={timestampColor} title={fullTime}>
              {timeAgo}
            </Text>
            {(canEdit || canDelete) && isHovered && (
              <Menu>
                <MenuButton
                  as={IconButton}
                  icon={<EditIcon />}
                  size="xs"
                  variant="ghost"
                  aria-label="Message options"
                />
                <MenuList>
                  {canEdit && (
                    <MenuItem icon={<EditIcon />} onClick={() => onEdit?.(message)}>
                      Edit Message
                    </MenuItem>
                  )}
                  {canDelete && (
                    <MenuItem
                      icon={<DeleteIcon />}
                      color="red.500"
                      onClick={() => onDelete?.(message.id)}
                    >
                      Delete Message
                    </MenuItem>
                  )}
                </MenuList>
              </Menu>
            )}
          </HStack>
          <Text fontSize="sm" color={textColor} whiteSpace="pre-wrap" wordBreak="break-word">
            {message.content}
          </Text>
        </VStack>
      </HStack>
    </Box>
  )
}

