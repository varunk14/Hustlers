'use client'

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
  Select,
  VStack,
  useToast,
} from '@chakra-ui/react'
import { useState } from 'react'
import { CreateChannelInput, ChannelType } from '@/types/channel'

interface CreateChannelModalProps {
  isOpen: boolean
  onClose: () => void
  onCreate: (input: CreateChannelInput) => Promise<{ error?: string }>
}

export function CreateChannelModal({ isOpen, onClose, onCreate }: CreateChannelModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<ChannelType>('text')
  const [loading, setLoading] = useState(false)
  const toast = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      toast({
        title: 'Name required',
        description: 'Please enter a channel name',
        status: 'error',
        duration: 3000,
      })
      return
    }

    setLoading(true)
    const result = await onCreate({
      name: name.trim(),
      description: description.trim() || undefined,
      type,
    })
    setLoading(false)

    if (result.error) {
      toast({
        title: 'Error creating channel',
        description: result.error,
        status: 'error',
        duration: 5000,
      })
    } else {
      toast({
        title: 'Channel created',
        description: `Channel "${name}" has been created`,
        status: 'success',
        duration: 3000,
      })
      setName('')
      setDescription('')
      setType('text')
      onClose()
    }
  }

  const handleClose = () => {
    if (!loading) {
      setName('')
      setDescription('')
      setType('text')
      onClose()
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="md">
      <ModalOverlay />
      <ModalContent>
        <form onSubmit={handleSubmit}>
          <ModalHeader>Create Channel</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Channel Name</FormLabel>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="general"
                  maxLength={100}
                  disabled={loading}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Description (optional)</FormLabel>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Channel description..."
                  maxLength={500}
                  rows={3}
                  disabled={loading}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Channel Type</FormLabel>
                <Select value={type} onChange={(e) => setType(e.target.value as ChannelType)} disabled={loading}>
                  <option value="text">Text Channel</option>
                  <option value="voice">Voice Channel</option>
                  <option value="video">Video Channel</option>
                </Select>
              </FormControl>
            </VStack>
          </ModalBody>

          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            <Button colorScheme="brand" type="submit" isLoading={loading}>
              Create Channel
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  )
}

