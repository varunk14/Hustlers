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

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
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

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      setLoading(false)
      return
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setSuccess(true)
      setLoading(false)
    }
  }

  const handleOAuthSignup = async (provider: 'google' | 'github') => {
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

  if (success) {
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
            <VStack spacing={4} align="center">
              <Alert status="success">
                <AlertIcon />
                Check your email to confirm your account!
              </Alert>
              <Text textAlign="center" color="gray.600" _dark={{ color: 'gray.400' }}>
                We've sent a confirmation link to {email}. Please check your inbox and
                click the link to verify your account.
              </Text>
              <Button as={NextLink} href="/login" colorScheme="brand" width="full">
                Back to Login
              </Button>
            </VStack>
          </Box>
        </Container>
      </MainLayout>
    )
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
                Create Account
              </Heading>
              <Text color="gray.600" _dark={{ color: 'gray.400' }}>
                Sign up to get started
              </Text>
            </VStack>

            {error && (
              <Alert status="error">
                <AlertIcon />
                {error}
              </Alert>
            )}

            <form onSubmit={handleEmailSignup}>
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
                  <Text fontSize="xs" color="gray.500" mt={1}>
                    Must be at least 6 characters
                  </Text>
                </FormControl>

                <FormControl isRequired>
                  <FormLabel>Confirm Password</FormLabel>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </FormControl>

                <Button
                  type="submit"
                  colorScheme="brand"
                  width="full"
                  isLoading={loading}
                  loadingText="Creating account..."
                >
                  Sign Up
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
                onClick={() => handleOAuthSignup('google')}
                isDisabled={loading}
              >
                Continue with Google
              </Button>
              <Button
                width="full"
                variant="outline"
                onClick={() => handleOAuthSignup('github')}
                isDisabled={loading}
              >
                Continue with GitHub
              </Button>
            </VStack>

            <HStack justify="center" spacing={2}>
              <Text fontSize="sm">
                Already have an account?{' '}
                <Link as={NextLink} href="/login" color="brand.500">
                  Sign in
                </Link>
              </Text>
            </HStack>
          </VStack>
        </Box>
      </Container>
    </MainLayout>
  )
}

