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
import { useState, useEffect } from 'react'
import { Channel, UpdateChannelInput, ChannelType } from '@/types/channel'

interface EditChannelModalProps {
  isOpen: boolean
  onClose: () => void
  channel: Channel | null
  onUpdate: (channelId: string, input: UpdateChannelInput) => Promise<{ error?: string }>
}

export function EditChannelModal({ isOpen, onClose, channel, onUpdate }: EditChannelModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<ChannelType>('text')
  const [loading, setLoading] = useState(false)
  const toast = useToast()

  useEffect(() => {
    if (channel) {
      setName(channel.name)
      setDescription(channel.description || '')
      setType(channel.type)
    }
  }, [channel])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!channel) return

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
    const result = await onUpdate(channel.id, {
      name: name.trim(),
      description: description.trim() || undefined,
      type,
    })
    setLoading(false)

    if (result.error) {
      toast({
        title: 'Error updating channel',
        description: result.error,
        status: 'error',
        duration: 5000,
      })
    } else {
      toast({
        title: 'Channel updated',
        description: `Channel "${name}" has been updated`,
        status: 'success',
        duration: 3000,
      })
      onClose()
    }
  }

  const handleClose = () => {
    if (!loading && channel) {
      setName(channel.name)
      setDescription(channel.description || '')
      setType(channel.type)
      onClose()
    }
  }

  if (!channel) return null

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="md">
      <ModalOverlay />
      <ModalContent>
        <form onSubmit={handleSubmit}>
          <ModalHeader>Edit Channel</ModalHeader>
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
              Save Changes
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  )
}

