export interface Server {
  id: string
  name: string
  description: string | null
  icon_url: string | null
  owner_id: string
  is_public: boolean
  created_at: string
  updated_at: string
}

export interface ServerMember {
  id: string
  server_id: string
  user_id: string
  role: 'owner' | 'admin' | 'member'
  joined_at: string
}

export interface ServerWithMember extends Server {
  member?: ServerMember
  member_count?: number
}

export interface CreateServerInput {
  name: string
  description?: string
  icon_url?: string
  is_public?: boolean
}

