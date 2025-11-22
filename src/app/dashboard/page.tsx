'use client'

// Disable static generation for this page
export const dynamic = 'force-dynamic'

import { Box, Heading, Text, VStack, Button, HStack, Spinner, Center } from '@chakra-ui/react'
import { MainLayout } from '@/components/layout/MainLayout'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { useAuth } from '@/contexts/AuthContext'
import { useProfile } from '@/hooks/useProfile'
import { ProfileCard } from '@/components/profile/ProfileCard'
import { ProfileEditModal } from '@/components/profile/ProfileEditModal'
import { useState } from 'react'
import NextLink from 'next/link'

export default function DashboardPage() {
  const { user, signOut } = useAuth()
  const { profile, loading, updateProfile } = useProfile(user?.id)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)

  return (
    <ProtectedRoute>
      <MainLayout>
        <VStack spacing={6} align="stretch" maxW="4xl" mx="auto">
          <Box>
            <Heading as="h1" size="xl" mb={2}>
              Dashboard
            </Heading>
            <Text color="gray.600" _dark={{ color: 'gray.400' }}>
              Welcome back, {profile?.display_name || user?.email}!
            </Text>
          </Box>

          {loading ? (
            <Center py={8}>
              <Spinner size="xl" />
            </Center>
          ) : profile ? (
            <ProfileCard
              profile={profile}
              isOwnProfile={true}
              onEditClick={() => setIsEditModalOpen(true)}
            />
          ) : null}

          <Box
            p={6}
            border="1px"
            borderColor="gray.200"
            _dark={{ borderColor: 'gray.700' }}
            borderRadius="lg"
          >
            <VStack spacing={4} align="stretch">
              <Text>
                This is your dashboard. More features will be added in future MVPs.
              </Text>
              <HStack spacing={4}>
                <Button as={NextLink} href="/profile" colorScheme="brand" variant="outline">
                  View Full Profile
                </Button>
                <Button onClick={signOut} colorScheme="red" variant="outline">
                  Sign Out
                </Button>
              </HStack>
            </VStack>
          </Box>

          {profile && (
            <ProfileEditModal
              isOpen={isEditModalOpen}
              onClose={() => setIsEditModalOpen(false)}
              profile={profile}
              onUpdate={updateProfile}
              userId={user?.id || ''}
            />
          )}
        </VStack>
      </MainLayout>
    </ProtectedRoute>
  )
}

