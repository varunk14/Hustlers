'use client'

import { useState, useEffect } from 'react'
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  VStack,
  Box,
  useToast,
} from '@chakra-ui/react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Profile } from '@/types/profile'
import { AvatarUpload } from './AvatarUpload'

const profileSchema = z.object({
  display_name: z.string().min(1, 'Display name is required').max(50, 'Display name too long'),
  status_message: z.string().max(200, 'Status message too long').optional(),
})

type ProfileFormData = z.infer<typeof profileSchema>

interface ProfileEditModalProps {
  isOpen: boolean
  onClose: () => void
  profile: Profile | null
  onUpdate: (updates: Partial<Profile>) => Promise<{ error: string | null }>
  userId: string
}

export function ProfileEditModal({
  isOpen,
  onClose,
  profile,
  onUpdate,
  userId,
}: ProfileEditModalProps) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const toast = useToast()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      display_name: profile?.display_name || '',
      status_message: profile?.status_message || '',
    },
  })

  useEffect(() => {
    if (profile) {
      reset({
        display_name: profile.display_name || '',
        status_message: profile.status_message || '',
      })
      setAvatarUrl(profile.avatar_url)
    }
  }, [profile, reset])

  const onSubmit = async (data: ProfileFormData) => {
    const updates: Partial<Profile> = {
      display_name: data.display_name,
      status_message: data.status_message || null,
    }

    if (avatarUrl) {
      updates.avatar_url = avatarUrl
    }

    const result = await onUpdate(updates)

    if (result.error) {
      toast({
        title: 'Update failed',
        description: result.error,
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
    } else {
      toast({
        title: 'Profile updated',
        description: 'Your profile has been successfully updated.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      })
      onClose()
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalOverlay />
      <ModalContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          <ModalHeader>Edit Profile</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              <FormControl>
                <FormLabel>Avatar</FormLabel>
                <Box display="flex" justifyContent="center">
                  <AvatarUpload
                    userId={userId}
                    currentAvatarUrl={avatarUrl}
                    onUploadComplete={setAvatarUrl}
                    size="xl"
                  />
                </Box>
              </FormControl>

              <FormControl isInvalid={!!errors.display_name}>
                <FormLabel>Display Name</FormLabel>
                <Input
                  {...register('display_name')}
                  placeholder="Enter your display name"
                />
                {errors.display_name && (
                  <Box color="red.500" fontSize="sm" mt={1}>
                    {errors.display_name.message}
                  </Box>
                )}
              </FormControl>

              <FormControl isInvalid={!!errors.status_message}>
                <FormLabel>Status Message</FormLabel>
                <Textarea
                  {...register('status_message')}
                  placeholder="What's on your mind?"
                  rows={3}
                />
                {errors.status_message && (
                  <Box color="red.500" fontSize="sm" mt={1}>
                    {errors.status_message.message}
                  </Box>
                )}
              </FormControl>
            </VStack>
          </ModalBody>

          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Cancel
            </Button>
            <Button colorScheme="brand" type="submit" isLoading={isSubmitting}>
              Save Changes
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  )
}

