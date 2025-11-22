'use client'

// Disable static generation for this page
export const dynamic = 'force-dynamic'

import { useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import {
  Box,
  Heading,
  VStack,
  HStack,
  Text,
  Flex,
  Center,
  useColorModeValue,
  Button,
  IconButton,
  useDisclosure,
  useToast,
  Input,
  Textarea,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  FormControl,
  FormLabel,
  Avatar,
  AvatarGroup,
} from '@chakra-ui/react'
import { AddIcon } from '@chakra-ui/icons'
import { MainLayout } from '@/components/layout/MainLayout'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { useAuth } from '@/contexts/AuthContext'
import { useDirectMessages } from '@/hooks/useDirectMessages'
import { useMessages } from '@/hooks/useMessages'
import { DMList } from '@/components/direct-message/DMList'
import { MessageList } from '@/components/message/MessageList'
import { MessageInput } from '@/components/message/MessageInput'
import { MessageWithUser } from '@/types/message'
import { createClient } from '@/lib/supabase/client'

function MessagesContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const conversationId = searchParams.get('conversation')
  const { user } = useAuth()
  const supabase = createClient()
  const toast = useToast()

  const {
    conversations,
    loading: conversationsLoading,
    createConversation,
    leaveConversation,
  } = useDirectMessages()

  const {
    messages,
    loading: messagesLoading,
    sending: messageSending,
    sendMessage,
    updateMessage,
    deleteMessage,
  } = useMessages(null, conversationId)

  const [editingMessage, setEditingMessage] = useState<MessageWithUser | null>(null)
  const [newConversationUsers, setNewConversationUsers] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Array<{ id: string; display_name: string | null; avatar_url: string | null }>>([])

  const {
    isOpen: isCreateOpen,
    onOpen: onCreateOpen,
    onClose: onCreateClose,
  } = useDisclosure()

  const sidebarBg = useColorModeValue('gray.100', 'gray.900')
  const sidebarBorder = useColorModeValue('gray.200', 'gray.700')
  const cardBg = useColorModeValue('white', 'gray.800')
  const cardBorder = useColorModeValue('gray.200', 'gray.700')
  const bg = useColorModeValue('gray.50', 'gray.900')

  const selectedConversation = conversations.find((c) => c.id === conversationId)

  const handleConversationClick = (id: string) => {
    router.push(`/messages?conversation=${id}`)
  }

  const handleSearchUsers = async (query: string) => {
    if (!query.trim() || !user) {
      setSearchResults([])
      return
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .ilike('display_name', `%${query}%`)
        .neq('id', user.id)
        .limit(10)

      if (!error && data) {
        setSearchResults(data)
      }
    } catch (err) {
      console.error('Error searching users:', err)
    }
  }

  const handleCreateConversation = async () => {
    if (newConversationUsers.length === 0) {
      toast({
        title: 'Error',
        description: 'Please select at least one user',
        status: 'error',
        duration: 3000,
      })
      return
    }

    const result = await createConversation({
      participant_ids: newConversationUsers,
    })

    if (result.error) {
      toast({
        title: 'Error',
        description: result.error,
        status: 'error',
        duration: 5000,
      })
    } else {
      toast({
        title: 'Conversation created',
        status: 'success',
        duration: 3000,
      })
      setNewConversationUsers([])
      setSearchQuery('')
      setSearchResults([])
      onCreateClose()
      if (result.data) {
        router.push(`/messages?conversation=${result.data.id}`)
      }
    }
  }

  // Get conversation display name
  const getConversationName = () => {
    if (!selectedConversation) return 'Messages'
    if (selectedConversation.name) return selectedConversation.name
    if (selectedConversation.type === 'direct') {
      const other = selectedConversation.participants.find((p) => p.user_id !== user?.id)
      return other?.user.display_name || 'Direct Message'
    }
    return `${selectedConversation.participants.length} members`
  }

  return (
    <ProtectedRoute>
      <MainLayout>
        <Flex h="calc(100vh - 80px)" overflow="hidden">
          {/* Sidebar */}
          <Box
            w="280px"
            bg={sidebarBg}
            borderRight="1px"
            borderColor={sidebarBorder}
            display="flex"
            flexDirection="column"
          >
            {/* Header */}
            <Box p={4} borderBottom="1px" borderColor={sidebarBorder}>
              <HStack justify="space-between" mb={3}>
                <Heading as="h2" size="md">
                  Messages
                </Heading>
                <IconButton
                  aria-label="New conversation"
                  icon={<AddIcon />}
                  size="sm"
                  variant="ghost"
                  onClick={onCreateOpen}
                />
              </HStack>
            </Box>

            {/* Conversations List */}
            <Box flex={1} overflowY="auto" p={2}>
              {conversationsLoading ? (
                <Center py={4}>
                  <Text fontSize="sm" color="gray.500">Loading...</Text>
                </Center>
              ) : (
                <DMList
                  conversations={conversations}
                  selectedConversationId={conversationId}
                  onConversationClick={handleConversationClick}
                  currentUserId={user?.id}
                />
              )}
            </Box>
          </Box>

          {/* Main Content */}
          <Box flex={1} display="flex" flexDirection="column" bg={bg} overflow="hidden">
            {selectedConversation ? (
              <>
                {/* Conversation Header */}
                <Box
                  px={6}
                  py={4}
                  borderBottom="1px"
                  borderColor={cardBorder}
                  bg={cardBg}
                >
                  <HStack justify="space-between">
                    <HStack spacing={3}>
                      {selectedConversation.type === 'direct' ? (
                        <Avatar
                          src={
                            selectedConversation.participants.find((p) => p.user_id !== user?.id)
                              ?.user.avatar_url || undefined
                          }
                          name={getConversationName()}
                          size="sm"
                        />
                      ) : (
                        <AvatarGroup size="sm" max={3}>
                          {selectedConversation.participants.slice(0, 3).map((p) => (
                            <Avatar
                              key={p.id}
                              src={p.user.avatar_url || undefined}
                              name={p.user.display_name || 'User'}
                            />
                          ))}
                        </AvatarGroup>
                      )}
                      <VStack align="start" spacing={0}>
                        <Text fontSize="lg" fontWeight="bold">
                          {getConversationName()}
                        </Text>
                        {selectedConversation.type === 'group' && (
                          <Text fontSize="xs" color="gray.500">
                            {selectedConversation.participants.length} members
                          </Text>
                        )}
                      </VStack>
                    </HStack>
                    {selectedConversation.type === 'group' && (
                      <Button
                        size="sm"
                        variant="outline"
                        colorScheme="red"
                        onClick={async () => {
                          if (confirm('Are you sure you want to leave this conversation?')) {
                            const result = await leaveConversation(selectedConversation.id)
                            if (result.error) {
                              toast({
                                title: 'Error',
                                description: result.error,
                                status: 'error',
                                duration: 5000,
                              })
                            } else {
                              router.push('/messages')
                            }
                          }
                        }}
                      >
                        Leave
                      </Button>
                    )}
                  </HStack>
                </Box>

                {/* Messages */}
                <MessageList
                  messages={messages}
                  loading={messagesLoading}
                  onEdit={(msg) => setEditingMessage(msg)}
                  onDelete={async (messageId) => {
                    if (confirm('Are you sure you want to delete this message?')) {
                      const result = await deleteMessage(messageId)
                      if (result.error) {
                        toast({
                          title: 'Error',
                          description: result.error,
                          status: 'error',
                          duration: 5000,
                        })
                      }
                    }
                  }}
                />
                <MessageInput
                  onSend={async (input) => {
                    const result = await sendMessage(input)
                    if (result.error) {
                      toast({
                        title: 'Error',
                        description: result.error,
                        status: 'error',
                        duration: 5000,
                      })
                      return { error: result.error }
                    }
                    return {}
                  }}
                  sending={messageSending}
                />
              </>
            ) : (
              <Center flex={1}>
                <VStack spacing={4}>
                  <Text fontSize="lg" color="gray.500">
                    Select a conversation or start a new one
                  </Text>
                  <Button colorScheme="brand" onClick={onCreateOpen}>
                    New Conversation
                  </Button>
                </VStack>
              </Center>
            )}
          </Box>
        </Flex>

        {/* Create Conversation Modal */}
        <Modal isOpen={isCreateOpen} onClose={onCreateClose} size="md">
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>New Conversation</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <VStack spacing={4} align="stretch">
                <FormControl>
                  <FormLabel>Search Users</FormLabel>
                  <Input
                    placeholder="Search by name..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value)
                      handleSearchUsers(e.target.value)
                    }}
                  />
                </FormControl>

                {searchResults.length > 0 && (
                  <Box maxH="300px" overflowY="auto">
                    <VStack spacing={2} align="stretch">
                      {searchResults.map((profile) => {
                        const isSelected = newConversationUsers.includes(profile.id)
                        return (
                          <HStack
                            key={profile.id}
                            p={2}
                            borderRadius="md"
                            bg={isSelected ? 'blue.50' : 'transparent'}
                            _hover={{ bg: 'gray.50' }}
                            cursor="pointer"
                            onClick={() => {
                              if (isSelected) {
                                setNewConversationUsers(newConversationUsers.filter((id) => id !== profile.id))
                              } else {
                                setNewConversationUsers([...newConversationUsers, profile.id])
                              }
                            }}
                          >
                            <Avatar src={profile.avatar_url || undefined} name={profile.display_name || 'User'} size="sm" />
                            <Text flex={1}>{profile.display_name || 'Unknown User'}</Text>
                            {isSelected && <Text color="blue.500">✓</Text>}
                          </HStack>
                        )
                      })}
                    </VStack>
                  </Box>
                )}

                {newConversationUsers.length > 0 && (
                  <Box>
                    <Text fontSize="sm" fontWeight="bold" mb={2}>
                      Selected ({newConversationUsers.length})
                    </Text>
                    <HStack spacing={2} flexWrap="wrap">
                      {newConversationUsers.map((userId) => {
                        const profile = searchResults.find((p) => p.id === userId)
                        return (
                          <HStack
                            key={userId}
                            px={2}
                            py={1}
                            bg="blue.100"
                            borderRadius="md"
                            spacing={1}
                          >
                            <Text fontSize="xs">{profile?.display_name || 'User'}</Text>
                            <Button
                              size="xs"
                              variant="ghost"
                              onClick={() => {
                                setNewConversationUsers(newConversationUsers.filter((id) => id !== userId))
                              }}
                            >
                              ×
                            </Button>
                          </HStack>
                        )
                      })}
                    </HStack>
                  </Box>
                )}
              </VStack>
            </ModalBody>

            <ModalFooter>
              <Button variant="ghost" mr={3} onClick={onCreateClose}>
                Cancel
              </Button>
              <Button colorScheme="brand" onClick={handleCreateConversation}>
                Create
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

        {/* Edit Message Modal */}
        {editingMessage && (
          <Box
            position="fixed"
            bottom="100px"
            left="50%"
            transform="translateX(-50%)"
            bg={cardBg}
            border="1px"
            borderColor={cardBorder}
            borderRadius="md"
            p={4}
            boxShadow="lg"
            zIndex={1000}
            maxW="500px"
            w="90%"
          >
            <VStack spacing={3} align="stretch">
              <Text fontWeight="bold">Edit Message</Text>
              <Textarea
                defaultValue={editingMessage.content}
                onKeyDown={async (e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    const content = (e.target as HTMLTextAreaElement).value.trim()
                    if (content) {
                      const result = await updateMessage(editingMessage.id, { content })
                      if (result.error) {
                        toast({
                          title: 'Error',
                          description: result.error,
                          status: 'error',
                          duration: 5000,
                        })
                      } else {
                        setEditingMessage(null)
                      }
                    }
                  }
                  if (e.key === 'Escape') {
                    setEditingMessage(null)
                  }
                }}
              />
              <HStack justify="flex-end">
                <Button size="sm" variant="ghost" onClick={() => setEditingMessage(null)}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  colorScheme="brand"
                  onClick={async () => {
                    const textarea = document.querySelector('textarea[defaultValue]') as HTMLTextAreaElement
                    const content = textarea?.value.trim()
                    if (content) {
                      const result = await updateMessage(editingMessage.id, { content })
                      if (result.error) {
                        toast({
                          title: 'Error',
                          description: result.error,
                          status: 'error',
                          duration: 5000,
                        })
                      } else {
                        setEditingMessage(null)
                      }
                    }
                  }}
                >
                  Save
                </Button>
              </HStack>
            </VStack>
          </Box>
        )}
      </MainLayout>
    </ProtectedRoute>
  )
}

export default function MessagesPage() {
  return (
    <Suspense fallback={
      <ProtectedRoute>
        <MainLayout>
          <Center h="calc(100vh - 80px)">
            <Text>Loading...</Text>
          </Center>
        </MainLayout>
      </ProtectedRoute>
    }>
      <MessagesContent />
    </Suspense>
  )
}

