'use client'

// Disable static generation for this page
export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Box,
  Button,
  Container,
  FormControl,
  FormLabel,
  Input,
  VStack,
  Heading,
  Text,
  Link,
  Alert,
  AlertIcon,
  HStack,
  Divider,
  useColorModeValue,
} from '@chakra-ui/react'
import { MainLayout } from '@/components/layout/MainLayout'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import NextLink from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const { user } = useAuth()
  const supabase = createClient()
  const cardBg = useColorModeValue('white', 'gray.800')
  const cardBorder = useColorModeValue('gray.200', 'gray.700')

  // Redirect if already logged in
  if (user) {
    router.push('/dashboard')
    return null
  }

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  const handleOAuthLogin = async (provider: 'google' | 'github') => {
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    }
  }

  return (
    <MainLayout>
      <Container maxW="md" py={8}>
        <Box
          bg={cardBg}
          p={8}
          borderRadius="lg"
          border="1px"
          borderColor={cardBorder}
          boxShadow="lg"
        >
          <VStack spacing={6} align="stretch">
            <VStack spacing={2} align="center">
              <Heading as="h1" size="xl">
                Welcome Back
              </Heading>
              <Text color="gray.600" _dark={{ color: 'gray.400' }}>
                Sign in to your account
              </Text>
            </VStack>

            {error && (
              <Alert status="error">
                <AlertIcon />
                {error}
              </Alert>
            )}

            <form onSubmit={handleEmailLogin}>
              <VStack spacing={4}>
                <FormControl isRequired>
                  <FormLabel>Email</FormLabel>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                  />
                </FormControl>

                <FormControl isRequired>
                  <FormLabel>Password</FormLabel>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </FormControl>

                <Button
                  type="submit"
                  colorScheme="brand"
                  width="full"
                  isLoading={loading}
                  loadingText="Signing in..."
                >
                  Sign In
                </Button>
              </VStack>
            </form>

            <HStack>
              <Divider />
              <Text fontSize="sm" color="gray.500">
                OR
              </Text>
              <Divider />
            </HStack>

            <VStack spacing={3}>
              <Button
                width="full"
                variant="outline"
                onClick={() => handleOAuthLogin('google')}
                isDisabled={loading}
              >
                Continue with Google
              </Button>
              <Button
                width="full"
                variant="outline"
                onClick={() => handleOAuthLogin('github')}
                isDisabled={loading}
              >
                Continue with GitHub
              </Button>
            </VStack>

            <HStack justify="center" spacing={2}>
              <Text fontSize="sm">
                Don't have an account?{' '}
                <Link as={NextLink} href="/signup" color="brand.500">
                  Sign up
                </Link>
              </Text>
            </HStack>

            <HStack justify="center">
              <Link as={NextLink} href="/reset-password" fontSize="sm" color="brand.500">
                Forgot password?
              </Link>
            </HStack>
          </VStack>
        </Box>
      </Container>
    </MainLayout>
  )
}
