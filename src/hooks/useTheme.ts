'use client'

import { useEffect, useState } from 'react'
import { useColorMode } from '@chakra-ui/react'

export function useTheme() {
  const { colorMode, toggleColorMode, setColorMode } = useColorMode()
  const [mounted, setMounted] = useState(false)

  // Handle hydration mismatch
  useEffect(() => {
    setMounted(true)
    // Load theme preference from localStorage
    const savedTheme = localStorage.getItem('chakra-ui-color-mode')
    if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark')) {
      setColorMode(savedTheme)
    }
  }, [setColorMode])

  return {
    colorMode,
    toggleColorMode,
    setColorMode,
    mounted,
    isDark: colorMode === 'dark',
    isLight: colorMode === 'light',
  }
}

