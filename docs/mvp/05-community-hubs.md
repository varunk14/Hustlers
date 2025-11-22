# MVP #5: Community Hub Creation (Servers)

**Status:** ✅ Completed  
**Date:** 2024

## Overview

This MVP implements the foundation for community hubs (servers), allowing users to create, discover, join, and leave servers.

## What Was Built

### 1. Database Schema
- ✅ `servers` table with RLS policies
- ✅ `server_members` table with RLS policies
- ✅ Indexes for performance
- ✅ Automatic `updated_at` trigger

### 2. Server Management
- ✅ Create servers with name, description, icon
- ✅ Public/private server toggle
- ✅ Automatic owner membership on creation
- ✅ Join/leave server functionality

### 3. Server Discovery
- ✅ Public servers listing
- ✅ Search functionality
- ✅ Server cards with information
- ✅ Member count display

### 4. Server Pages
- ✅ Server detail/view page
- ✅ Server information display
- ✅ Join/leave actions
- ✅ Owner/member badges

### 5. UI Components
- ✅ ServerCard component
- ✅ CreateServerModal component
- ✅ Updated discover page
- ✅ Server icon upload (reuses avatar upload)

## Files Created

### Types
- `src/types/server.ts` - Server and member TypeScript types

### Hooks
- `src/hooks/useServers.ts` - Server operations (create, join, leave, fetch)
- `src/hooks/useUserServers.ts` - Fetch user's servers

### Components
- `src/components/server/ServerCard.tsx` - Server display card
- `src/components/server/CreateServerModal.tsx` - Server creation form

### Pages
- `src/app/servers/[id]/page.tsx` - Server detail page

### Documentation
- Updated `docs/database/schema.md` with servers and server_members tables

## Files Modified

- `src/app/discover/page.tsx` - Added server listing and search

## Setup Required

### 1. Database Schema

Run the SQL scripts from `docs/database/schema.md` in the Supabase SQL Editor:

1. Go to Supabase Dashboard → SQL Editor
2. Copy the SQL for `servers` table
3. Copy the SQL for `server_members` table
4. Copy the trigger SQL
5. Execute all scripts

### 2. Storage for Server Icons

Server icons use the same `avatars` storage bucket as user avatars. The storage setup from MVP #4 is sufficient.

## Features

### Server Creation
- ✅ Name (required, max 100 chars)
- ✅ Description (optional, max 500 chars)
- ✅ Icon upload (optional)
- ✅ Public/private toggle
- ✅ Automatic owner membership

### Server Discovery
- ✅ List all public servers
- ✅ Search by name or description
- ✅ Display server cards with info
- ✅ Show member count
- ✅ Join button for non-members

### Server Management
- ✅ View server details
- ✅ Join public servers
- ✅ Leave servers (except owner)
- ✅ Owner/member badges
- ✅ Server information display

### Security
- ✅ Row Level Security (RLS) on all tables
- ✅ Users can only see accessible servers
- ✅ Only owners can update/delete servers
- ✅ Users can only manage their own memberships

## Technical Details

### Database Schema

**servers table:**
- `id` - UUID primary key
- `name` - Server name (required)
- `description` - Server description (optional)
- `icon_url` - Server icon URL (optional)
- `owner_id` - Server owner (references auth.users)
- `is_public` - Public/private flag
- `created_at`, `updated_at` - Timestamps

**server_members table:**
- `id` - UUID primary key
- `server_id` - Server reference
- `user_id` - User reference
- `role` - 'owner', 'admin', or 'member'
- `joined_at` - Timestamp
- Unique constraint on (server_id, user_id)

### RLS Policies

**Servers:**
- View: Public servers or servers user is member of
- Create: Authenticated users can create servers
- Update/Delete: Only owners

**Server Members:**
- View: Members of servers user belongs to
- Insert: Users can join public servers
- Delete: Users can leave servers

### Data Flow

```
Create Server → Insert server record → Create owner membership
                ↓
         Server appears in public list
                ↓
         User clicks Join → Insert membership
                ↓
         User can view server details
```

## Testing

### Manual Testing Steps

1. **Create Server**
   - Navigate to `/discover`
   - Click "Create Server"
   - Fill in name, description, upload icon
   - Toggle public/private
   - Create server
   - Should redirect to server page

2. **Discover Servers**
   - Navigate to `/discover`
   - Should see list of public servers
   - Try searching for servers
   - Click on a server card

3. **Join Server**
   - View a server you're not a member of
   - Click "Join Server"
   - Should become a member
   - Badge should change to "Member"

4. **Leave Server**
   - View a server you're a member of (not owner)
   - Click "Leave Server"
   - Should redirect to discover page
   - Server should no longer show member badge

5. **Server Details**
   - Navigate to `/servers/{id}`
   - Should see server information
   - Should see owner/member badge
   - Should see join/leave button based on membership

## Next Steps

The next MVP will be: **MVP #6: Text Channel Management**

This will add:
- Create channels within servers
- Edit/delete channels
- Channel navigation
- Channel permissions (future)

## Notes

- Server icons reuse the avatar upload component and storage bucket
- Member counts are calculated on-the-fly (can be optimized with materialized views)
- Server sidebar navigation will be added in a future MVP when channels are implemented
- Private servers require invite links (to be implemented in MVP #10: Invite System)

