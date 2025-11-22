import { render, screen } from '@testing-library/react'
import { ChakraProvider } from '@chakra-ui/react'
import Home from '../page'
import theme from '@/lib/theme'

const renderWithProviders = (ui: React.ReactElement) => {
  return render(<ChakraProvider theme={theme}>{ui}</ChakraProvider>)
}

describe('Home Page', () => {
  it('renders the hero section', () => {
    renderWithProviders(<Home />)
    expect(screen.getByText('Build Your Community')).toBeInTheDocument()
    expect(
      screen.getByText(/A full-featured community platform inspired by Discord/)
    ).toBeInTheDocument()
  })

  it('renders the features section', () => {
    renderWithProviders(<Home />)
    expect(screen.getByText('Powerful Features')).toBeInTheDocument()
    expect(screen.getByText('Real-Time Chat')).toBeInTheDocument()
    expect(screen.getByText('Voice & Video')).toBeInTheDocument()
  })

  it('renders the CTA section', () => {
    renderWithProviders(<Home />)
    expect(screen.getByText('Ready to Get Started?')).toBeInTheDocument()
  })
})

