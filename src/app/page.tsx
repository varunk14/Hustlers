'use client'

import {
  Box,
  Button,
  Heading,
  Text,
  VStack,
  HStack,
  SimpleGrid,
  useColorModeValue,
} from '@chakra-ui/react'
import { MainLayout } from '@/components/layout/MainLayout'
import Link from 'next/link'

export default function Home() {
  const bgGradient = useColorModeValue(
    'linear(to-br, brand.50, brand.100)',
    'linear(to-br, gray.800, gray.900)'
  )
  const cardBg = useColorModeValue('white', 'gray.800')
  const cardBorder = useColorModeValue('gray.200', 'gray.700')

  const features = [
    {
      title: 'Real-Time Chat',
      description: 'Instant messaging with low latency and real-time updates',
      icon: '💬',
    },
    {
      title: 'Voice & Video',
      description: 'Crystal clear voice and video calls powered by WebRTC',
      icon: '🎥',
    },
    {
      title: 'Community Hubs',
      description: 'Create and join communities with custom channels and roles',
      icon: '🏠',
    },
    {
      title: 'Moderation Tools',
      description: 'Powerful moderation features to keep communities safe',
      icon: '🛡️',
    },
    {
      title: 'Custom Bots',
      description: 'Integrate bots to automate tasks and enhance functionality',
      icon: '🤖',
    },
    {
      title: 'Media Sharing',
      description: 'Share images, files, and GIFs seamlessly in conversations',
      icon: '📎',
    },
  ]

  return (
    <MainLayout>
      <Box>
        {/* Hero Section */}
        <Box
          bgGradient={bgGradient}
          borderRadius="xl"
          py={20}
          px={8}
          mb={16}
          textAlign="center"
        >
          <VStack spacing={6}>
            <Heading
              as="h1"
              size="2xl"
              bgGradient="linear(to-r, brand.400, brand.600)"
              bgClip="text"
            >
              Build Your Community
            </Heading>
            <Text fontSize="xl" maxW="2xl" color="gray.600" _dark={{ color: 'gray.300' }}>
              A full-featured community platform inspired by Discord. Connect, chat, and
              collaborate with your community in real-time.
            </Text>
            <HStack spacing={4} pt={4}>
              <Button as={Link} href="/discover" size="lg" colorScheme="brand">
                Discover Communities
              </Button>
              <Button
                as={Link}
                href="/login"
                size="lg"
                variant="outline"
                colorScheme="brand"
              >
                Get Started
              </Button>
            </HStack>
          </VStack>
        </Box>

        {/* Features Section */}
        <Box mb={16}>
          <Heading as="h2" size="xl" textAlign="center" mb={12}>
            Powerful Features
          </Heading>
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={8}>
            {features.map((feature, index) => (
              <Box
                key={index}
                p={6}
                bg={cardBg}
                borderRadius="lg"
                border="1px"
                borderColor={cardBorder}
                _hover={{
                  transform: 'translateY(-4px)',
                  boxShadow: 'lg',
                  transition: 'all 0.2s',
                }}
              >
                <VStack align="start" spacing={4}>
                  <Text fontSize="4xl">{feature.icon}</Text>
                  <Heading as="h3" size="md">
                    {feature.title}
                  </Heading>
                  <Text color="gray.600" _dark={{ color: 'gray.400' }}>
                    {feature.description}
                  </Text>
                </VStack>
              </Box>
            ))}
          </SimpleGrid>
        </Box>

        {/* CTA Section */}
        <Box
          bg={cardBg}
          borderRadius="xl"
          p={12}
          textAlign="center"
          border="1px"
          borderColor={cardBorder}
        >
          <VStack spacing={6}>
            <Heading as="h2" size="lg">
              Ready to Get Started?
            </Heading>
            <Text fontSize="lg" color="gray.600" _dark={{ color: 'gray.400' }} maxW="md">
              Join thousands of communities or create your own today.
            </Text>
            <Button as={Link} href="/login" size="lg" colorScheme="brand">
              Create Your Community
            </Button>
          </VStack>
        </Box>
      </Box>
    </MainLayout>
  )
}

