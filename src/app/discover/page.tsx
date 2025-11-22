'use client'

// Disable static generation for this page
export const dynamic = 'force-dynamic'

import { useState } from 'react'
import {
  Box,
  Heading,
  VStack,
  HStack,
  Input,
  Button,
  SimpleGrid,
  Spinner,
  Center,
  Text,
  useColorModeValue,
} from '@chakra-ui/react'
import { MainLayout } from '@/components/layout/MainLayout'
import { useServers } from '@/hooks/useServers'
import { ServerCard } from '@/components/server/ServerCard'
import { CreateServerModal } from '@/components/server/CreateServerModal'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

export default function DiscoverPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [joiningServerId, setJoiningServerId] = useState<string | null>(null)
  const [leavingServerId, setLeavingServerId] = useState<string | null>(null)
  const { servers, loading, error, createServer, joinServer, leaveServer } = useServers()
  const router = useRouter()
  const { user } = useAuth()

  const filteredServers = servers.filter((server) =>
    server.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    server.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleJoin = async (serverId: string) => {
    setJoiningServerId(serverId)
    const result = await joinServer(serverId)
    setJoiningServerId(null)
    if (!result.error) {
      router.push(`/servers/${serverId}`)
    }
  }

  const handleLeave = async (serverId: string) => {
    setLeavingServerId(serverId)
    await leaveServer(serverId)
    setLeavingServerId(null)
  }

  const handleView = (serverId: string) => {
    router.push(`/servers/${serverId}`)
  }

  const cardBg = useColorModeValue('gray.50', 'gray.900')

  return (
    <MainLayout>
      <Box bg={cardBg} minH="100vh" py={8}>
        <VStack spacing={6} align="stretch" maxW="7xl" mx="auto" px={4}>
          <HStack justify="space-between" align="center" flexWrap="wrap" gap={4}>
            <Heading as="h1" size="xl">
              Discover Communities
            </Heading>
            {user && (
              <Button colorScheme="brand" onClick={() => setIsCreateModalOpen(true)}>
                Create Server
              </Button>
            )}
          </HStack>

          <Input
            placeholder="Search servers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            maxW="md"
          />

          {loading && (
            <Center py={12}>
              <Spinner size="xl" />
            </Center>
          )}

          {error && (
            <Box p={4} bg="red.50" borderRadius="md" border="1px" borderColor="red.200">
              <Text color="red.800">Error loading servers: {error}</Text>
            </Box>
          )}

          {!loading && !error && filteredServers.length === 0 && (
            <Center py={12}>
              <VStack spacing={4}>
                <Text fontSize="lg" color="gray.500">
                  {searchQuery ? 'No servers found matching your search.' : 'No servers found.'}
                </Text>
                {user && !searchQuery && (
                  <Button colorScheme="brand" onClick={() => setIsCreateModalOpen(true)}>
                    Create the First Server
                  </Button>
                )}
              </VStack>
            </Center>
          )}

          {!loading && filteredServers.length > 0 && (
            <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
              {filteredServers.map((server) => (
                <ServerCard
                  key={server.id}
                  server={server}
                  onJoin={() => handleJoin(server.id)}
                  onLeave={() => handleLeave(server.id)}
                  onView={() => handleView(server.id)}
                  isJoining={joiningServerId === server.id}
                  isLeaving={leavingServerId === server.id}
                />
              ))}
            </SimpleGrid>
          )}
        </VStack>

        {user && (
          <CreateServerModal
            isOpen={isCreateModalOpen}
            onClose={() => setIsCreateModalOpen(false)}
            onCreate={async (input) => {
              const result = await createServer(input)
              if (!result.error) {
                router.push(`/servers/${result.data?.id}`)
              }
              return result
            }}
          />
        )}
      </Box>
    </MainLayout>
  )
}

