'use client'

import { Box, Container } from '@chakra-ui/react'
import { Navbar } from './Navbar'

interface MainLayoutProps {
  children: React.ReactNode
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <Box minH="100vh">
      <Navbar />
      <Container maxW="container.xl" py={8}>
        {children}
      </Container>
    </Box>
  )
}

