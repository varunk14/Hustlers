# MVP #8: Direct Messaging (1:1 / Small Group)

**Status:** ✅ Completed  
**Date:** 2024

## Overview

This MVP implements direct messaging functionality, allowing users to have private 1:1 conversations and small group conversations outside of public channels.

## What Was Built

### 1. Database Schema
- ✅ `direct_messages` table (conversations)
- ✅ `direct_message_participants` table
- ✅ Extended `messages` table to support both channels and DMs
- ✅ RLS policies for conversations and participants
- ✅ Realtime enabled for conversations
- ✅ Indexes for performance

### 2. Direct Messaging Features
- ✅ Create 1:1 conversations
- ✅ Create group conversations
- ✅ Auto-detect existing 1:1 conversations
- ✅ Real-time messaging in conversations
- ✅ Leave group conversations
- ✅ Conversation list with last message preview

### 3. UI Components
- ✅ DMList component for conversation sidebar
- ✅ Messages page with conversation view
- ✅ Create conversation modal with user search
- ✅ Conversation header with participant info

### 4. Integration
- ✅ Updated useMessages hook to support conversations
- ✅ Reused MessageList and MessageInput components
- ✅ Added Messages link to navigation

## Files Created

### Database
- `docs/database/setup-direct-messages.sql` - Complete DM setup script

### Types
- `src/types/direct-message.ts` - Direct message TypeScript types

### Hooks
- `src/hooks/useDirectMessages.ts` - DM conversation operations

### Components
- `src/components/direct-message/DMList.tsx` - Conversation list sidebar

### Pages
- `src/app/messages/page.tsx` - Messages page with conversation view

## Files Modified

- `src/types/message.ts` - Updated to support conversation_id
- `src/hooks/useMessages.ts` - Extended to support both channels and conversations
- `src/components/layout/Navbar.tsx` - Added Messages link

## Setup Required

### 1. Database Schema

Run the SQL script from `docs/database/setup-direct-messages.sql` in the Supabase SQL Editor:

1. Go to Supabase Dashboard → SQL Editor
2. Copy the entire contents of `setup-direct-messages.sql`
3. Execute the script

This will:
- Create `direct_messages` and `direct_message_participants` tables
- Extend `messages` table with `conversation_id` column
- Update RLS policies for messages to support DMs
- Enable Realtime for conversations
- Create indexes

## Features

### Conversation Creation
- ✅ Start 1:1 conversation with any user
- ✅ Create group conversation with multiple users
- ✅ Auto-detect existing 1:1 conversations (prevents duplicates)
- ✅ User search to find conversation partners
- ✅ Visual selection of participants

### Conversation Management
- ✅ View all conversations in sidebar
- ✅ See last message preview
- ✅ See relative timestamps
- ✅ Leave group conversations
- ✅ Real-time conversation list updates

### Messaging
- ✅ Send messages in conversations (reuses channel messaging)
- ✅ Real-time message delivery
- ✅ Edit own messages
- ✅ Delete own messages
- ✅ Message history loading

### UI/UX
- ✅ Discord-style conversation list
- ✅ Avatar display (single for 1:1, group for group chats)
- ✅ Conversation name display (user name for 1:1, member count for groups)
- ✅ Last message preview
- ✅ Selected conversation highlighting

### Security
- ✅ Row Level Security (RLS) on all tables
- ✅ Users can only see conversations they're part of
- ✅ Users can only send messages in their conversations
- ✅ Proper permission checks for all operations

## Technical Details

### Database Schema

**direct_messages table:**
- `id` - UUID primary key
- `name` - Optional name for group conversations
- `type` - 'direct' or 'group'
- `created_at`, `updated_at` - Timestamps

**direct_message_participants table:**
- `id` - UUID primary key
- `conversation_id` - Conversation reference
- `user_id` - User reference
- `joined_at` - Timestamp
- Unique constraint on (conversation_id, user_id)

**messages table (extended):**
- Added `conversation_id` column (nullable)
- Constraint: either `channel_id` or `conversation_id` must be set
- Updated RLS policies to support both channels and conversations

### RLS Policies

**Direct Messages:**
- View: Conversations user is part of
- Create: Authenticated users
- Update: Users in the conversation

**Direct Message Participants:**
- View: Participants of conversations user is part of
- Insert: Users can join (with restrictions for 1:1)
- Delete: Users can leave

**Messages (updated):**
- View: Messages in accessible channels OR conversations user is part of
- Insert: Messages in accessible channels OR conversations user is part of

### Data Flow

```
User creates conversation → Insert conversation record
                ↓
         Add participants
                ↓
         Conversation appears in list
                ↓
         User sends message → Insert message with conversation_id
                ↓
         Real-time update to all participants
```

### Conversation Types

**Direct (1:1):**
- Automatically created between two users
- Prevents duplicate conversations
- Shows other user's name and avatar
- No name field (uses participant name)

**Group:**
- Created with 3+ participants
- Can have optional name
- Shows member count
- Shows group avatars (up to 3)

## Testing

### Manual Testing Steps

1. **Create 1:1 Conversation**
   - Navigate to Messages page
   - Click "+" to create new conversation
   - Search for a user
   - Select user and create
   - Should open conversation view

2. **Create Group Conversation**
   - Create new conversation
   - Search and select multiple users
   - Create conversation
   - Should show group conversation

3. **Send Messages**
   - Open a conversation
   - Type and send message
   - Should appear immediately
   - Open in another browser to verify real-time

4. **Auto-Detect Existing 1:1**
   - Try to create 1:1 with same user again
   - Should open existing conversation instead

5. **Leave Group**
   - Open group conversation
   - Click "Leave" button
   - Confirm
   - Should remove from conversation list

6. **Conversation List**
   - Should show all conversations
   - Should show last message preview
   - Should show relative timestamps
   - Should highlight selected conversation

## Next Steps

The next MVP will be: **MVP #9: Media Sharing**

This will add:
- Image upload and sharing
- File attachments
- GIF support
- Media preview in messages

## Notes

- Conversations reuse the same messages table as channels
- Real-time subscriptions work for both channels and conversations
- 1:1 conversations are automatically detected to prevent duplicates
- Group conversations can have custom names (future enhancement)
- Message components are reused from channel messaging
- Conversation list updates in real-time when new messages arrive
- No read receipts yet (can be added in future MVP)
- No typing indicators yet (can be added in future MVP)

