'use client'

import { useState, useRef } from 'react'
import {
  Box,
  Avatar,
  IconButton,
  Tooltip,
  useToast,
  Spinner,
  useColorModeValue,
} from '@chakra-ui/react'
import { EditIcon } from '@chakra-ui/icons'
import { uploadAvatar } from '@/lib/storage'

interface AvatarUploadProps {
  userId: string
  currentAvatarUrl: string | null
  onUploadComplete: (url: string) => void
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

export function AvatarUpload({
  userId,
  currentAvatarUrl,
  onUploadComplete,
  size = 'xl',
}: AvatarUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const toast = useToast()
  const bg = useColorModeValue('white', 'gray.700')

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Show preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setPreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)

    // Upload
    setUploading(true)
    const result = await uploadAvatar(file, userId)

    if (result.error) {
      toast({
        title: 'Upload failed',
        description: result.error,
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
      setPreview(null)
    } else if (result.url) {
      toast({
        title: 'Avatar updated',
        description: 'Your avatar has been successfully updated.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      })
      onUploadComplete(result.url)
      setPreview(null)
    }

    setUploading(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <Box position="relative" display="inline-block">
      <Avatar
        src={preview || currentAvatarUrl || undefined}
        size={size}
        name={userId}
        bg={bg}
      />
      {uploading && (
        <Box
          position="absolute"
          top="0"
          left="0"
          right="0"
          bottom="0"
          display="flex"
          alignItems="center"
          justifyContent="center"
          bg="blackAlpha.500"
          borderRadius="full"
        >
          <Spinner size="sm" color="white" />
        </Box>
      )}
      <Tooltip label="Change avatar">
        <IconButton
          aria-label="Upload avatar"
          icon={<EditIcon />}
          size="sm"
          position="absolute"
          bottom="0"
          right="0"
          borderRadius="full"
          colorScheme="brand"
          onClick={() => fileInputRef.current?.click()}
          isDisabled={uploading}
        />
      </Tooltip>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />
    </Box>
  )
}

