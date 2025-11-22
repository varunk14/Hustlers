import { createClient } from '@/lib/supabase/client'

const AVATAR_BUCKET = 'avatars'
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

export interface UploadResult {
  url: string | null
  error: string | null
}

/**
 * Resize image to max 512x512 while maintaining aspect ratio
 */
function resizeImage(file: File, maxSize: number = 512): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let width = img.width
        let height = img.height

        // Calculate new dimensions
        if (width > height) {
          if (width > maxSize) {
            height = (height * maxSize) / width
            width = maxSize
          }
        } else {
          if (height > maxSize) {
            width = (width * maxSize) / height
            height = maxSize
          }
        }

        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Could not get canvas context'))
          return
        }

        ctx.drawImage(img, 0, 0, width, height)
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob)
            } else {
              reject(new Error('Failed to create blob'))
            }
          },
          file.type,
          0.9
        )
      }
      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = e.target?.result as string
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}

/**
 * Upload avatar image to Supabase Storage
 */
export async function uploadAvatar(
  file: File,
  userId: string
): Promise<UploadResult> {
  const supabase = createClient()

  // Validate file type
  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      url: null,
      error: 'Invalid file type. Please upload a JPEG, PNG, WebP, or GIF image.',
    }
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      url: null,
      error: 'File size too large. Maximum size is 5MB.',
    }
  }

  try {
    // Resize image
    const resizedBlob = await resizeImage(file)
    const resizedFile = new File([resizedBlob], file.name, { type: file.type })

    // Generate unique filename
    const fileExt = file.name.split('.').pop()
    const fileName = `${userId}-${Date.now()}.${fileExt}`

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(AVATAR_BUCKET)
      .upload(fileName, resizedFile, {
        cacheControl: '3600',
        upsert: false,
      })

    if (error) {
      return { url: null, error: error.message }
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(data.path)

    return { url: publicUrl, error: null }
  } catch (err) {
    return {
      url: null,
      error: err instanceof Error ? err.message : 'Failed to upload image',
    }
  }
}

/**
 * Delete avatar from Supabase Storage
 */
export async function deleteAvatar(avatarUrl: string): Promise<{ error: string | null }> {
  const supabase = createClient()

  try {
    // Extract path from URL
    const urlParts = avatarUrl.split('/')
    const fileName = urlParts[urlParts.length - 1]

    const { error } = await supabase.storage.from(AVATAR_BUCKET).remove([fileName])

    if (error) {
      return { error: error.message }
    }

    return { error: null }
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'Failed to delete image',
    }
  }
}

