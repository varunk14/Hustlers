'use client'

import { useState } from 'react'
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
  HStack,
  Box,
  useToast,
  Switch,
  FormHelperText,
} from '@chakra-ui/react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { CreateServerInput } from '@/types/server'
import { AvatarUpload } from '../profile/AvatarUpload'
import { useAuth } from '@/contexts/AuthContext'

const serverSchema = z.object({
  name: z.string().min(1, 'Server name is required').max(100, 'Server name too long'),
  description: z.string().max(500, 'Description too long').optional(),
  is_public: z.boolean().default(true),
})

type ServerFormData = z.infer<typeof serverSchema>

interface CreateServerModalProps {
  isOpen: boolean
  onClose: () => void
  onCreate: (input: CreateServerInput) => Promise<{ error: string | null }>
}

export function CreateServerModal({ isOpen, onClose, onCreate }: CreateServerModalProps) {
  const [iconUrl, setIconUrl] = useState<string | null>(null)
  const toast = useToast()
  const { user } = useAuth()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    watch,
  } = useForm<ServerFormData>({
    resolver: zodResolver(serverSchema),
    defaultValues: {
      name: '',
      description: '',
      is_public: true,
    },
  })

  const isPublic = watch('is_public')

  const onSubmit = async (data: ServerFormData) => {
    const input: CreateServerInput = {
      name: data.name,
      description: data.description || undefined,
      icon_url: iconUrl || undefined,
      is_public: data.is_public,
    }

    const result = await onCreate(input)

    if (result.error) {
      toast({
        title: 'Failed to create server',
        description: result.error,
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
    } else {
      toast({
        title: 'Server created!',
        description: 'Your server has been successfully created.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      })
      reset()
      setIconUrl(null)
      onClose()
    }
  }

  const handleClose = () => {
    reset()
    setIconUrl(null)
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="md">
      <ModalOverlay />
      <ModalContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          <ModalHeader>Create New Server</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              <FormControl>
                <FormLabel>Server Icon</FormLabel>
                <Box display="flex" justifyContent="center">
                  <AvatarUpload
                    userId={user?.id || 'temp'}
                    currentAvatarUrl={iconUrl}
                    onUploadComplete={(url) => {
                      setIconUrl(url)
                    }}
                    size="xl"
                  />
                </Box>
                <FormHelperText>Optional: Upload a server icon</FormHelperText>
              </FormControl>

              <FormControl isInvalid={!!errors.name}>
                <FormLabel>Server Name</FormLabel>
                <Input
                  {...register('name')}
                  placeholder="My Awesome Server"
                />
                {errors.name && (
                  <Box color="red.500" fontSize="sm" mt={1}>
                    {errors.name.message}
                  </Box>
                )}
              </FormControl>

              <FormControl isInvalid={!!errors.description}>
                <FormLabel>Description</FormLabel>
                <Textarea
                  {...register('description')}
                  placeholder="What is this server about?"
                  rows={3}
                />
                {errors.description && (
                  <Box color="red.500" fontSize="sm" mt={1}>
                    {errors.description.message}
                  </Box>
                )}
              </FormControl>

              <FormControl>
                <HStack>
                  <Switch
                    {...register('is_public')}
                    colorScheme="brand"
                  />
                  <VStack align="start" spacing={0}>
                    <FormLabel mb={0}>Public Server</FormLabel>
                    <FormHelperText mt={0}>
                      {isPublic
                        ? 'Anyone can discover and join this server'
                        : 'Only people with an invite link can join'}
                    </FormHelperText>
                  </VStack>
                </HStack>
              </FormControl>
            </VStack>
          </ModalBody>

          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={handleClose}>
              Cancel
            </Button>
            <Button colorScheme="brand" type="submit" isLoading={isSubmitting}>
              Create Server
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  )
}

