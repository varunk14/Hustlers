'use client'

import {
  Box,
  VStack,
  HStack,
  Text,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  useColorModeValue,
  Divider,
} from '@chakra-ui/react'
import { Channel } from '@/types/channel'
import { ChevronDownIcon, EditIcon, DeleteIcon } from '@chakra-ui/icons'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { useState, useEffect } from 'react'

interface ChannelListProps {
  channels: Channel[]
  serverId: string
  serverOwnerId: string
  onChannelClick?: (channelId: string) => void
  onEdit?: (channel: Channel) => void
  onDelete?: (channelId: string) => void
  selectedChannelId?: string | null
}

export function ChannelList({
  channels,
  serverId,
  serverOwnerId,
  onChannelClick,
  onEdit,
  onDelete,
  selectedChannelId,
}: ChannelListProps) {
  const { user } = useAuth()
  const [userRole, setUserRole] = useState<'owner' | 'admin' | 'member' | null>(null)
  const supabase = createClient()

  const bg = useColorModeValue('gray.50', 'gray.800')
  const hoverBg = useColorModeValue('gray.100', 'gray.700')
  const selectedBg = useColorModeValue('blue.100', 'blue.900')
  const textColor = useColorModeValue('gray.700', 'gray.300')
  const selectedTextColor = useColorModeValue('blue.700', 'blue.200')

  useEffect(() => {
    if (!user) return

    const fetchUserRole = async () => {
      // Check if user is owner
      if (user.id === serverOwnerId) {
        setUserRole('owner')
        return
      }

      // Check membership
      const { data } = await supabase
        .from('server_members')
        .select('role')
        .eq('server_id', serverId)
        .eq('user_id', user.id)
        .single()

      if (data) {
        setUserRole(data.role as 'owner' | 'admin' | 'member')
      } else {
        setUserRole(null)
      }
    }

    fetchUserRole()
  }, [user, serverId, serverOwnerId, supabase])

  const canManage = userRole === 'owner' || userRole === 'admin'

  const textChannels = channels.filter((c) => c.type === 'text')
  const voiceChannels = channels.filter((c) => c.type === 'voice')
  const videoChannels = channels.filter((c) => c.type === 'video')

  const ChannelItem = ({ channel }: { channel: Channel }) => {
    const isSelected = selectedChannelId === channel.id
    const icon = channel.type === 'text' ? '#' : channel.type === 'voice' ? '🔊' : '📹'

    return (
      <Box
        as="div"
        w="full"
        px={2}
        py={1.5}
        borderRadius="md"
        bg={isSelected ? selectedBg : 'transparent'}
        color={isSelected ? selectedTextColor : textColor}
        _hover={{ bg: isSelected ? selectedBg : hoverBg }}
        onClick={() => onChannelClick?.(channel.id)}
        cursor="pointer"
        transition="all 0.2s"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onChannelClick?.(channel.id)
          }
        }}
      >
        <HStack justify="space-between" spacing={2}>
          <HStack spacing={2} flex={1} minW={0}>
            <Text fontSize="sm" fontWeight="medium" noOfLines={1}>
              {icon} {channel.name}
            </Text>
          </HStack>
          {canManage && (
            <Menu>
              <MenuButton
                as={IconButton}
                icon={<ChevronDownIcon />}
                size="xs"
                variant="ghost"
                onClick={(e) => e.stopPropagation()}
                aria-label="Channel options"
              />
              <MenuList>
                <MenuItem icon={<EditIcon />} onClick={() => onEdit?.(channel)}>
                  Edit Channel
                </MenuItem>
                <MenuItem
                  icon={<DeleteIcon />}
                  color="red.500"
                  onClick={() => onDelete?.(channel.id)}
                >
                  Delete Channel
                </MenuItem>
              </MenuList>
            </Menu>
          )}
        </HStack>
      </Box>
    )
  }

  const ChannelSection = ({ title, channels: sectionChannels }: { title: string; channels: Channel[] }) => {
    if (sectionChannels.length === 0) return null

    return (
      <Box>
        <Text
          fontSize="xs"
          fontWeight="bold"
          textTransform="uppercase"
          color={useColorModeValue('gray.500', 'gray.400')}
          px={2}
          py={1}
        >
          {title}
        </Text>
        <VStack spacing={0.5} align="stretch" mt={1}>
          {sectionChannels.map((channel) => (
            <ChannelItem key={channel.id} channel={channel} />
          ))}
        </VStack>
      </Box>
    )
  }

  if (channels.length === 0) {
    return (
      <Box p={4}>
        <Text fontSize="sm" color={textColor} textAlign="center">
          No channels yet. {canManage && 'Create one to get started!'}
        </Text>
      </Box>
    )
  }

  return (
    <VStack spacing={4} align="stretch" p={2}>
      <ChannelSection title="Text Channels" channels={textChannels} />
      {voiceChannels.length > 0 && (
        <>
          <Divider />
          <ChannelSection title="Voice Channels" channels={voiceChannels} />
        </>
      )}
      {videoChannels.length > 0 && (
        <>
          <Divider />
          <ChannelSection title="Video Channels" channels={videoChannels} />
        </>
      )}
    </VStack>
  )
}

