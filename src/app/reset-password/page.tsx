'use client'

// Disable static generation for this page
export const dynamic = 'force-dynamic'

import { useState } from 'react'
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
  useColorModeValue,
} from '@chakra-ui/react'
import { MainLayout } from '@/components/layout/MainLayout'
import { createClient } from '@/lib/supabase/client'
import NextLink from 'next/link'

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const supabase = createClient()

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password-confirm`,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setSuccess(true)
      setLoading(false)
    }
  }

  const cardBg = useColorModeValue('white', 'gray.800')
  const cardBorder = useColorModeValue('gray.200', 'gray.700')

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
                Check your email!
              </Alert>
              <Text textAlign="center" color="gray.600" _dark={{ color: 'gray.400' }}>
                We've sent a password reset link to {email}. Please check your inbox and
                click the link to reset your password.
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
                Reset Password
              </Heading>
              <Text color="gray.600" _dark={{ color: 'gray.400' }} textAlign="center">
                Enter your email address and we'll send you a link to reset your password
              </Text>
            </VStack>

            {error && (
              <Alert status="error">
                <AlertIcon />
                {error}
              </Alert>
            )}

            <form onSubmit={handleResetPassword}>
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

                <Button
                  type="submit"
                  colorScheme="brand"
                  width="full"
                  isLoading={loading}
                  loadingText="Sending..."
                >
                  Send Reset Link
                </Button>
              </VStack>
            </form>

            <VStack spacing={2}>
              <Link as={NextLink} href="/login" fontSize="sm" color="brand.500">
                Back to Login
              </Link>
            </VStack>
          </VStack>
        </Box>
      </Container>
    </MainLayout>
  )
}

