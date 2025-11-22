export interface Profile {
  id: string
  display_name: string | null
  avatar_url: string | null
  status_message: string | null
  created_at: string
  updated_at: string
}

export interface ProfileUpdate {
  display_name?: string
  avatar_url?: string
  status_message?: string
}

