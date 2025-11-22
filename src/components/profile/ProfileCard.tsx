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
} from '@chakra-ui/react'
import { Profile } from '@/types/profile'
import { format } from 'date-fns'

interface ProfileCardProps {
  profile: Profile
  isOwnProfile?: boolean
  onEditClick?: () => void
}

export function ProfileCard({ profile, isOwnProfile = false, onEditClick }: ProfileCardProps) {
  const cardBg = useColorModeValue('white', 'gray.800')
  const cardBorder = useColorModeValue('gray.200', 'gray.700')
  const bg = useColorModeValue('gray.50', 'gray.700')

  return (
    <Box
      bg={cardBg}
      border="1px"
      borderColor={cardBorder}
      borderRadius="lg"
      p={6}
      boxShadow="md"
    >
      <VStack spacing={4} align="stretch">
        <HStack spacing={4}>
          <Avatar
            src={profile.avatar_url || undefined}
            name={profile.display_name || 'User'}
            size="xl"
            bg={bg}
          />
          <VStack align="start" spacing={1} flex={1}>
            <Heading as="h2" size="lg">
              {profile.display_name || 'Anonymous User'}
            </Heading>
            <Text fontSize="sm" color="gray.500">
              Member since {format(new Date(profile.created_at), 'MMMM yyyy')}
            </Text>
          </VStack>
          {isOwnProfile && onEditClick && (
            <Button size="sm" colorScheme="brand" onClick={onEditClick}>
              Edit Profile
            </Button>
          )}
        </HStack>

        {profile.status_message && (
          <Box
            bg={bg}
            p={3}
            borderRadius="md"
            borderLeft="4px"
            borderColor="brand.500"
          >
            <Text fontSize="sm" fontStyle="italic">
              "{profile.status_message}"
            </Text>
          </Box>
        )}
      </VStack>
    </Box>
  )
}

