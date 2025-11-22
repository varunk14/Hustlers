export type ChannelType = 'text' | 'voice' | 'video'

export interface Channel {
  id: string
  server_id: string
  name: string
  description: string | null
  type: ChannelType
  position: number
  created_at: string
  updated_at: string
}

export interface CreateChannelInput {
  name: string
  description?: string
  type?: ChannelType
  position?: number
}

export interface UpdateChannelInput {
  name?: string
  description?: string
  type?: ChannelType
  position?: number
}

