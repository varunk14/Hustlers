'use client'

// Disable static generation for this page
export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { Box, VStack, Spinner, Center, Text } from '@chakra-ui/react'
import { MainLayout } from '@/components/layout/MainLayout'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { useAuth } from '@/contexts/AuthContext'
import { useProfile } from '@/hooks/useProfile'
import { ProfileCard } from '@/components/profile/ProfileCard'
import { ProfileEditModal } from '@/components/profile/ProfileEditModal'

export default function ProfilePage() {
  const { user } = useAuth()
  const { profile, loading, error, updateProfile } = useProfile(user?.id)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)

  return (
    <ProtectedRoute>
      <MainLayout>
        <VStack spacing={6} align="stretch" maxW="2xl" mx="auto">
          {loading && (
            <Center py={8}>
              <Spinner size="xl" />
            </Center>
          )}

          {error && (
            <Box p={4} bg="red.50" borderRadius="md" border="1px" borderColor="red.200">
              <Text color="red.800">Error loading profile: {error}</Text>
            </Box>
          )}

          {profile && !loading && (
            <>
              <ProfileCard
                profile={profile}
                isOwnProfile={true}
                onEditClick={() => setIsEditModalOpen(true)}
              />

              <ProfileEditModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                profile={profile}
                onUpdate={updateProfile}
                userId={user?.id || ''}
              />
            </>
          )}
        </VStack>
      </MainLayout>
    </ProtectedRoute>
  )
}

