import { extendTheme, type ThemeConfig } from '@chakra-ui/react'

// Theme configuration
const config: ThemeConfig = {
  initialColorMode: 'dark',
  useSystemColorMode: false,
}

// Custom theme colors
const colors = {
  brand: {
    50: '#e3f2fd',
    100: '#bbdefb',
    200: '#90caf9',
    300: '#64b5f6',
    400: '#42a5f5',
    500: '#2196f3',
    600: '#1e88e5',
    700: '#1976d2',
    800: '#1565c0',
    900: '#0d47a1',
  },
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },
}

// Custom component styles
const components = {
  Button: {
    defaultProps: {
      colorScheme: 'brand',
    },
    variants: {
      solid: {
        borderRadius: 'md',
        fontWeight: 'medium',
      },
    },
  },
  Container: {
    baseStyle: {
      maxW: 'container.xl',
    },
  },
}

// Custom styles
const styles = {
  global: (props: { colorMode: string }) => ({
    body: {
      bg: props.colorMode === 'dark' ? 'gray.900' : 'gray.50',
      color: props.colorMode === 'dark' ? 'gray.100' : 'gray.900',
    },
  }),
}

// Extend the theme
const theme = extendTheme({
  config,
  colors,
  components,
  styles,
})

export default theme

