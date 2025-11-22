'use client'

// Disable static generation for this page
export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import {
  Box,
  Heading,
  VStack,
  HStack,
  Text,
  Spinner,
  Center,
  Button,
  Avatar,
  Badge,
  useColorModeValue,
  Flex,
  IconButton,
  useDisclosure,
  useToast,
  Textarea,
} from '@chakra-ui/react'
import { AddIcon } from '@chakra-ui/icons'
import { MainLayout } from '@/components/layout/MainLayout'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { createClient } from '@/lib/supabase/client'
import { Server, ServerMember } from '@/types/server'
import { Channel } from '@/types/channel'
import { useAuth } from '@/contexts/AuthContext'
import { format } from 'date-fns'
import { useChannels } from '@/hooks/useChannels'
import { useMessages } from '@/hooks/useMessages'
import { ChannelList } from '@/components/channel/ChannelList'
import { CreateChannelModal } from '@/components/channel/CreateChannelModal'
import { EditChannelModal } from '@/components/channel/EditChannelModal'
import { MessageList } from '@/components/message/MessageList'
import { MessageInput } from '@/components/message/MessageInput'
import { MessageWithUser } from '@/types/message'

export default function ServerPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const serverId = params.id as string
  const channelId = searchParams.get('channel')
  const [server, setServer] = useState<Server | null>(null)
  const [member, setMember] = useState<ServerMember | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingChannel, setEditingChannel] = useState<Channel | null>(null)
  const [editingMessage, setEditingMessage] = useState<MessageWithUser | null>(null)
  const supabase = createClient()
  const toast = useToast()

  const {
    channels,
    loading: channelsLoading,
    createChannel,
    updateChannel,
    deleteChannel,
  } = useChannels(serverId)

  const {
    messages,
    loading: messagesLoading,
    sending: messageSending,
    sendMessage,
    updateMessage,
    deleteMessage,
  } = useMessages(channelId)

  const {
    isOpen: isCreateOpen,
    onOpen: onCreateOpen,
    onClose: onCreateClose,
  } = useDisclosure()
  const {
    isOpen: isEditOpen,
    onOpen: onEditOpen,
    onClose: onEditClose,
  } = useDisclosure()

  const cardBg = useColorModeValue('white', 'gray.800')
  const cardBorder = useColorModeValue('gray.200', 'gray.700')
  const bg = useColorModeValue('gray.50', 'gray.700')
  const sidebarBg = useColorModeValue('gray.100', 'gray.900')
  const sidebarBorder = useColorModeValue('gray.200', 'gray.700')

  const fetchServer = useCallback(async () => {
    if (!serverId || !user) return
    try {
      setLoading(true)
      setError(null)

      // Fetch server
      const { data: serverData, error: serverError } = await supabase
        .from('servers')
        .select('*')
        .eq('id', serverId)
        .single()

      if (serverError) throw serverError

      // Check if user is a member
      const { data: memberData } = await supabase
        .from('server_members')
        .select('*')
        .eq('server_id', serverId)
        .eq('user_id', user.id)
        .single()

      setServer(serverData)
      setMember(memberData || null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load server')
    } finally {
      setLoading(false)
    }
  }, [serverId, user, supabase])

  useEffect(() => {
    fetchServer()
  }, [fetchServer])

  const handleJoin = async () => {
    if (!user) return

    const { error } = await supabase.from('server_members').insert({
      server_id: serverId,
      user_id: user.id,
      role: 'member',
    })

    if (!error) {
      await fetchServer()
    }
  }

  const handleLeave = async () => {
    if (!user) return

    const { error } = await supabase
      .from('server_members')
      .delete()
      .eq('server_id', serverId)
      .eq('user_id', user.id)

    if (!error) {
      router.push('/discover')
    }
  }

  if (loading) {
    return (
      <ProtectedRoute>
        <MainLayout>
          <Center minH="50vh">
            <Spinner size="xl" />
          </Center>
        </MainLayout>
      </ProtectedRoute>
    )
  }

  if (error || !server) {
    return (
      <ProtectedRoute>
        <MainLayout>
          <Center minH="50vh">
            <VStack spacing={4}>
              <Text color="red.500">{error || 'Server not found'}</Text>
              <Button onClick={() => router.push('/discover')}>Back to Discover</Button>
            </VStack>
          </Center>
        </MainLayout>
      </ProtectedRoute>
    )
  }

  const isOwner = member?.role === 'owner' || server.owner_id === user?.id
  const isMember = !!member
  const canManage = isOwner || member?.role === 'admin'

  const handleChannelClick = (channelId: string) => {
    router.push(`/servers/${serverId}?channel=${channelId}`)
  }

  const handleCreateChannel = async (input: Parameters<typeof createChannel>[0]) => {
    const result = await createChannel(input)
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
  }

  const handleEditChannel = (channel: Channel) => {
    setEditingChannel(channel)
    onEditOpen()
  }

  const handleUpdateChannel = async (channelId: string, input: Parameters<typeof updateChannel>[1]) => {
    const result = await updateChannel(channelId, input)
    if (result.error) {
      toast({
        title: 'Error',
        description: result.error,
        status: 'error',
        duration: 5000,
      })
      return { error: result.error }
    } else {
      onEditClose()
      setEditingChannel(null)
    }
    return {}
  }

  const handleDeleteChannel = async (channelIdToDelete: string) => {
    if (!confirm('Are you sure you want to delete this channel? This action cannot be undone.')) {
      return
    }

    const result = await deleteChannel(channelIdToDelete)
    if (result.error) {
      toast({
        title: 'Error',
        description: result.error,
        status: 'error',
        duration: 5000,
      })
    } else {
      toast({
        title: 'Channel deleted',
        status: 'success',
        duration: 3000,
      })
      // If deleted channel was selected, clear selection
      if (channelIdToDelete === channelId) {
        router.push(`/servers/${serverId}`)
      }
    }
  }

  const selectedChannel = channels.find((c) => c.id === channelId)

  return (
    <ProtectedRoute>
      <MainLayout>
        <Flex h="calc(100vh - 80px)" overflow="hidden">
          {/* Sidebar */}
          <Box
            w="240px"
            bg={sidebarBg}
            borderRight="1px"
            borderColor={sidebarBorder}
            display="flex"
            flexDirection="column"
          >
            {/* Server Header */}
            <Box p={4} borderBottom="1px" borderColor={sidebarBorder}>
              <HStack spacing={3}>
                <Avatar src={server.icon_url || undefined} name={server.name} size="sm" bg={bg} />
                <VStack align="start" spacing={0} flex={1} minW={0}>
                  <Text fontWeight="bold" fontSize="sm" noOfLines={1}>
                    {server.name}
                  </Text>
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
                </VStack>
              </HStack>
            </Box>

            {/* Channels Section */}
            <Box flex={1} overflowY="auto" p={2}>
              <HStack justify="space-between" mb={2} px={2}>
                <Text fontSize="xs" fontWeight="bold" textTransform="uppercase" color="gray.500">
                  Channels
                </Text>
                {canManage && (
                  <IconButton
                    aria-label="Create channel"
                    icon={<AddIcon />}
                    size="xs"
                    variant="ghost"
                    onClick={onCreateOpen}
                  />
                )}
              </HStack>
              {channelsLoading ? (
                <Center py={4}>
                  <Spinner size="sm" />
                </Center>
              ) : (
                <ChannelList
                  channels={channels}
                  serverId={serverId}
                  serverOwnerId={server.owner_id}
                  onChannelClick={handleChannelClick}
                  onEdit={handleEditChannel}
                  onDelete={handleDeleteChannel}
                  selectedChannelId={channelId}
                />
              )}
            </Box>

            {/* Server Actions */}
            <Box p={2} borderTop="1px" borderColor={sidebarBorder}>
              {!isMember && (
                <Button colorScheme="brand" size="sm" w="full" onClick={handleJoin}>
                  Join Server
                </Button>
              )}
              {isMember && !isOwner && (
                <Button variant="outline" colorScheme="red" size="sm" w="full" onClick={handleLeave}>
                  Leave Server
                </Button>
              )}
            </Box>
          </Box>

          {/* Main Content */}
          <Box flex={1} display="flex" flexDirection="column" bg={bg} overflow="hidden">
            {selectedChannel ? (
              <>
                {/* Channel Header */}
                <Box
                  px={6}
                  py={4}
                  borderBottom="1px"
                  borderColor={cardBorder}
                  bg={cardBg}
                >
                  <VStack align="start" spacing={1}>
                    <HStack spacing={2}>
                      <Text fontSize="lg" fontWeight="bold">
                        #{selectedChannel.name}
                      </Text>
                    </HStack>
                    {selectedChannel.description && (
                      <Text fontSize="sm" color="gray.600" _dark={{ color: 'gray.400' }}>
                        {selectedChannel.description}
                      </Text>
                    )}
                  </VStack>
                </Box>

                {/* Messages */}
                {selectedChannel.type === 'text' ? (
                  <>
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
                    {isMember && (
                      <MessageInput
                        onSend={async (input) => {
                          console.log('📤 ServerPage: Sending message via MessageInput')
                          const result = await sendMessage(input)
                          console.log('📥 ServerPage: Send result:', result)
                          
                          // Don't show toast here - MessageInput already handles it
                          // Just return the result
                          return result
                        }}
                        sending={messageSending}
                      />
                    )}
                  </>
                ) : (
                  <Center flex={1}>
                    <VStack spacing={4}>
                      <Text fontSize="lg" color="gray.500">
                        {selectedChannel.type === 'voice'
                          ? 'Voice channels are coming soon!'
                          : 'Video channels are coming soon!'}
                      </Text>
                      <Text fontSize="sm" color="gray.400">
                        This feature will be available in a future MVP
                      </Text>
                    </VStack>
                  </Center>
                )}
              </>
            ) : (
              <Box p={6}>
                <VStack spacing={6} align="stretch" maxW="4xl" mx="auto">
                  <Box
                    bg={cardBg}
                    border="1px"
                    borderColor={cardBorder}
                    borderRadius="lg"
                    p={8}
                    boxShadow="md"
                  >
                    <HStack spacing={6} align="start">
                      <Avatar src={server.icon_url || undefined} name={server.name} size="2xl" bg={bg} />
                      <VStack align="start" spacing={4} flex={1}>
                        <HStack spacing={3}>
                          <Heading as="h1" size="xl">
                            {server.name}
                          </Heading>
                          {isOwner && (
                            <Badge colorScheme="purple" fontSize="md">
                              Owner
                            </Badge>
                          )}
                          {isMember && !isOwner && (
                            <Badge colorScheme="green" fontSize="md">
                              Member
                            </Badge>
                          )}
                        </HStack>

                        {server.description && (
                          <Text fontSize="lg" color="gray.600" _dark={{ color: 'gray.400' }}>
                            {server.description}
                          </Text>
                        )}

                        <HStack spacing={4} fontSize="sm" color="gray.500">
                          <Text>Created {format(new Date(server.created_at), 'MMMM d, yyyy')}</Text>
                          <Text>•</Text>
                          <Text>{server.is_public ? 'Public' : 'Private'} Server</Text>
                        </HStack>
                      </VStack>
                    </HStack>
                  </Box>

                  <Box
                    bg={cardBg}
                    border="1px"
                    borderColor={cardBorder}
                    borderRadius="lg"
                    p={6}
                  >
                    <VStack spacing={4} align="stretch">
                      <Heading as="h2" size="md">
                        Welcome to {server.name}
                      </Heading>
                      <Text>
                        {channels.length === 0
                          ? 'No channels yet. Create one to get started!'
                          : 'Select a channel from the sidebar to start chatting.'}
                      </Text>
                    </VStack>
                  </Box>
                </VStack>
              </Box>
            )}
          </Box>
        </Flex>

        {/* Modals */}
        <CreateChannelModal
          isOpen={isCreateOpen}
          onClose={onCreateClose}
          onCreate={handleCreateChannel}
        />
        <EditChannelModal
          isOpen={isEditOpen}
          onClose={onEditClose}
          channel={editingChannel}
          onUpdate={handleUpdateChannel}
        />

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

