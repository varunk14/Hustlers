export type ConversationType = 'direct' | 'group'

export interface DirectMessage {
  id: string
  name: string | null
  type: ConversationType
  created_at: string
  updated_at: string
}

export interface DirectMessageParticipant {
  id: string
  conversation_id: string
  user_id: string
  joined_at: string
}

export interface DirectMessageWithParticipants extends DirectMessage {
  participants: Array<{
    id: string
    user_id: string
    user: {
      id: string
      display_name: string | null
      avatar_url: string | null
    }
  }>
  last_message?: {
    id: string
    content: string
    created_at: string
    user_id: string
  }
  unread_count?: number
}

export interface CreateDirectMessageInput {
  participant_ids: string[] // User IDs to include (excluding current user)
  name?: string // Optional name for group conversations
  type?: ConversationType
}

export interface UpdateDirectMessageInput {
  name?: string
}

