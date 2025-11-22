'use client'

import {
  Box,
  Avatar,
  VStack,
  HStack,
  Text,
  Heading,
  Button,
  useColorModeValue,
  Badge,
} from '@chakra-ui/react'
import { ServerWithMember } from '@/types/server'
import { format } from 'date-fns'

interface ServerCardProps {
  server: ServerWithMember
  onJoin?: () => void
  onLeave?: () => void
  onView?: () => void
  isJoining?: boolean
  isLeaving?: boolean
}

export function ServerCard({
  server,
  onJoin,
  onLeave,
  onView,
  isJoining = false,
  isLeaving = false,
}: ServerCardProps) {
  const cardBg = useColorModeValue('white', 'gray.800')
  const cardBorder = useColorModeValue('gray.200', 'gray.700')
  const bg = useColorModeValue('gray.50', 'gray.700')

  const isMember = !!server.member
  const isOwner = server.member?.role === 'owner'

  return (
    <Box
      bg={cardBg}
      border="1px"
      borderColor={cardBorder}
      borderRadius="lg"
      p={6}
      boxShadow="md"
      _hover={{ boxShadow: 'lg', transform: 'translateY(-2px)', transition: 'all 0.2s' }}
      cursor={onView ? 'pointer' : 'default'}
      onClick={onView}
    >
      <HStack spacing={4} align="start">
        <Avatar
          src={server.icon_url || undefined}
          name={server.name}
          size="lg"
          bg={bg}
        />
        <VStack align="start" spacing={2} flex={1}>
          <HStack spacing={2}>
            <Heading as="h3" size="md">
              {server.name}
            </Heading>
            {isOwner && (
              <Badge colorScheme="purple" fontSize="xs">
                Owner
              </Badge>
            )}
            {isMember && !isOwner && (
              <Badge colorScheme="green" fontSize="xs">
                Member
              </Badge>
            )}
          </HStack>

          {server.description && (
            <Text fontSize="sm" color="gray.600" _dark={{ color: 'gray.400' }} noOfLines={2}>
              {server.description}
            </Text>
          )}

          <HStack spacing={4} fontSize="xs" color="gray.500">
            <Text>Created {format(new Date(server.created_at), 'MMM yyyy')}</Text>
            {server.member_count !== undefined && (
              <Text>{server.member_count} member{server.member_count !== 1 ? 's' : ''}</Text>
            )}
          </HStack>

          {!isMember && onJoin && (
            <Button
              size="sm"
              colorScheme="brand"
              onClick={(e) => {
                e.stopPropagation()
                onJoin()
              }}
              isLoading={isJoining}
              loadingText="Joining..."
            >
              Join Server
            </Button>
          )}

          {isMember && !isOwner && onLeave && (
            <Button
              size="sm"
              variant="outline"
              colorScheme="red"
              onClick={(e) => {
                e.stopPropagation()
                onLeave()
              }}
              isLoading={isLeaving}
              loadingText="Leaving..."
            >
              Leave Server
            </Button>
          )}

          {isMember && onView && (
            <Button
              size="sm"
              variant="ghost"
              colorScheme="brand"
              onClick={(e) => {
                e.stopPropagation()
                onView()
              }}
            >
              View Server
            </Button>
          )}
        </VStack>
      </HStack>
    </Box>
  )
}

