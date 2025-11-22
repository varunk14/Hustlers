'use client'

import {
  Box,
  Flex,
  HStack,
  Link,
  Text,
  useColorModeValue,
} from '@chakra-ui/react'
import { ThemeToggle } from '../theme/ThemeToggle'
import { useAuth } from '@/contexts/AuthContext'

export function Navbar() {
  const { user } = useAuth()
  const bg = useColorModeValue('white', 'gray.800')
  const borderColor = useColorModeValue('gray.200', 'gray.700')

  return (
    <Box
      as="nav"
      bg={bg}
      borderBottom="1px"
      borderColor={borderColor}
      px={4}
      py={3}
      position="sticky"
      top={0}
      zIndex={1000}
    >
      <Flex justify="space-between" align="center" maxW="container.xl" mx="auto">
        <HStack spacing={8}>
          <Link href="/" _hover={{ textDecoration: 'none' }}>
            <Text fontSize="xl" fontWeight="bold">
              Community Platform
            </Text>
          </Link>
          <HStack spacing={4} display={{ base: 'none', md: 'flex' }}>
            <Link href="/" _hover={{ textDecoration: 'underline' }}>
              Home
            </Link>
            <Link href="/discover" _hover={{ textDecoration: 'underline' }}>
              Discover
            </Link>
            {user && (
              <>
                <Link href="/messages" _hover={{ textDecoration: 'underline' }}>
                  Messages
                </Link>
                <Link href="/profile" _hover={{ textDecoration: 'underline' }}>
                  Profile
                </Link>
              </>
            )}
          </HStack>
        </HStack>
        <HStack spacing={4}>
          <ThemeToggle />
        </HStack>
      </Flex>
    </Box>
  )
}

