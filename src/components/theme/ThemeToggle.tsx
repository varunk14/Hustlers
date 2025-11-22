'use client'

import { IconButton, useColorMode, Tooltip } from '@chakra-ui/react'
import { MoonIcon, SunIcon } from '@chakra-ui/icons'

export function ThemeToggle() {
  const { colorMode, toggleColorMode } = useColorMode()

  return (
    <Tooltip label={colorMode === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}>
      <IconButton
        aria-label="Toggle theme"
        icon={colorMode === 'light' ? <MoonIcon /> : <SunIcon />}
        onClick={toggleColorMode}
        variant="ghost"
        size="md"
      />
    </Tooltip>
  )
}

