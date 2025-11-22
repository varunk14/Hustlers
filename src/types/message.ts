export interface Message {
  id: string
  channel_id: string | null
  conversation_id: string | null
  user_id: string
  content: string
  created_at: string
  updated_at: string
}

export interface MessageWithUser extends Message {
  user: {
    id: string
    display_name: string | null
    avatar_url: string | null
  }
}

export interface CreateMessageInput {
  content: string
}

export interface UpdateMessageInput {
  content: string
}

