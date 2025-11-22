# Database Schema

This document describes the database schema for the Discord-Style Community Platform.

## Supabase Setup

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Wait for the project to be provisioned
4. Get your project URL and anon key from Settings → API

### 2. Run SQL Scripts

Execute the following SQL scripts in the Supabase SQL Editor (Dashboard → SQL Editor).

## Tables

### profiles

User profiles linked to Supabase Auth users.

```sql
-- Create profiles table
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  display_name TEXT,
  avatar_url TEXT,
  status_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Users can view all profiles
CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Create function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER on_profile_updated
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
```

### servers

Community hubs/servers that users can create and join.

**⚠️ Important**: The servers table policy references `server_members`, so you must run the complete setup script in order. See `setup-servers.sql` for the correct order.

```sql
-- Create servers table
CREATE TABLE public.servers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon_url TEXT,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.servers ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Users can view public servers or servers they're members of
CREATE POLICY "Users can view accessible servers"
  ON public.servers FOR SELECT
  USING (
    is_public = true 
    OR owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.server_members 
      WHERE server_members.server_id = servers.id 
      AND server_members.user_id = auth.uid()
    )
  );

-- Only authenticated users can create servers
CREATE POLICY "Authenticated users can create servers"
  ON public.servers FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = owner_id);

-- Only owners can update their servers
CREATE POLICY "Owners can update their servers"
  ON public.servers FOR UPDATE
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Only owners can delete their servers
CREATE POLICY "Owners can delete their servers"
  ON public.servers FOR DELETE
  USING (owner_id = auth.uid());

-- Create index for faster queries
CREATE INDEX idx_servers_owner_id ON public.servers(owner_id);
CREATE INDEX idx_servers_is_public ON public.servers(is_public);
CREATE INDEX idx_servers_created_at ON public.servers(created_at DESC);
```

### server_members

Tracks which users are members of which servers.

```sql
-- Create server_members table
CREATE TABLE public.server_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  server_id UUID REFERENCES public.servers(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')) NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(server_id, user_id)
);

-- Enable Row Level Security
ALTER TABLE public.server_members ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Users can view members of servers they belong to
CREATE POLICY "Users can view members of their servers"
  ON public.server_members FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.server_members sm
      WHERE sm.server_id = server_members.server_id
      AND sm.user_id = auth.uid()
    )
  );

-- Authenticated users can join public servers
CREATE POLICY "Users can join public servers"
  ON public.server_members FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.servers
      WHERE servers.id = server_members.server_id
      AND servers.is_public = true
    )
  );

-- Users can leave servers they're members of
CREATE POLICY "Users can leave servers"
  ON public.server_members FOR DELETE
  USING (user_id = auth.uid());

-- Create indexes for faster queries
CREATE INDEX idx_server_members_server_id ON public.server_members(server_id);
CREATE INDEX idx_server_members_user_id ON public.server_members(user_id);
CREATE UNIQUE INDEX idx_server_members_unique ON public.server_members(server_id, user_id);
```

### Update triggers

Add trigger to update `updated_at` for servers:

```sql
-- Create trigger for servers updated_at
CREATE TRIGGER on_server_updated
  BEFORE UPDATE ON public.servers
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
```

### channels

Text, voice, and video channels within servers.

**⚠️ Important**: The channels table references `servers` and `server_members`, so you must run the servers setup first. See `setup-channels.sql` for the complete setup.

```sql
-- Create channels table
CREATE TABLE public.channels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  server_id UUID REFERENCES public.servers(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT DEFAULT 'text' CHECK (type IN ('text', 'voice', 'video')) NOT NULL,
  position INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Users can view channels of servers they can access
CREATE POLICY "Users can view channels of accessible servers"
  ON public.channels FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.servers
      WHERE servers.id = channels.server_id
      AND (
        servers.is_public = true
        OR servers.owner_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.server_members
          WHERE server_members.server_id = servers.id
          AND server_members.user_id = auth.uid()
        )
      )
    )
  );

-- Only server owners and admins can create channels
CREATE POLICY "Server owners and admins can create channels"
  ON public.channels FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND auth.uid() IS NOT NULL
    AND (
      EXISTS (
        SELECT 1 FROM public.servers
        WHERE servers.id = channels.server_id
        AND servers.owner_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.server_members
        WHERE server_members.server_id = channels.server_id
        AND server_members.user_id = auth.uid()
        AND server_members.role IN ('owner', 'admin')
      )
    )
  );

-- Only server owners and admins can update channels
CREATE POLICY "Server owners and admins can update channels"
  ON public.channels FOR UPDATE
  USING (
    auth.uid() IS NOT NULL
    AND (
      EXISTS (
        SELECT 1 FROM public.servers
        WHERE servers.id = channels.server_id
        AND servers.owner_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.server_members
        WHERE server_members.server_id = channels.server_id
        AND server_members.user_id = auth.uid()
        AND server_members.role IN ('owner', 'admin')
      )
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (
      EXISTS (
        SELECT 1 FROM public.servers
        WHERE servers.id = channels.server_id
        AND servers.owner_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.server_members
        WHERE server_members.server_id = channels.server_id
        AND server_members.user_id = auth.uid()
        AND server_members.role IN ('owner', 'admin')
      )
    )
  );

-- Only server owners and admins can delete channels
CREATE POLICY "Server owners and admins can delete channels"
  ON public.channels FOR DELETE
  USING (
    auth.uid() IS NOT NULL
    AND (
      EXISTS (
        SELECT 1 FROM public.servers
        WHERE servers.id = channels.server_id
        AND servers.owner_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.server_members
        WHERE server_members.server_id = channels.server_id
        AND server_members.user_id = auth.uid()
        AND server_members.role IN ('owner', 'admin')
      )
    )
  );

-- Create trigger for updated_at
CREATE TRIGGER on_channel_updated
  BEFORE UPDATE ON public.channels
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Create indexes for performance
CREATE INDEX idx_channels_server_id ON public.channels(server_id);
CREATE INDEX idx_channels_type ON public.channels(type);
CREATE INDEX idx_channels_position ON public.channels(server_id, position);
```

### messages

Messages sent in channels.

**⚠️ Important**: The messages table references `channels` and `auth.users`, so you must run the channels setup first. See `setup-messages.sql` for the complete setup.

```sql
-- Create messages table
CREATE TABLE public.messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id UUID REFERENCES public.channels(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Enable Realtime for messages table
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Create policies
-- Users can view messages in channels they can access
CREATE POLICY "Users can view messages in accessible channels"
  ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.channels
      WHERE channels.id = messages.channel_id
      AND EXISTS (
        SELECT 1 FROM public.servers
        WHERE servers.id = channels.server_id
        AND (
          servers.is_public = true
          OR servers.owner_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.server_members
            WHERE server_members.server_id = servers.id
            AND server_members.user_id = auth.uid()
          )
        )
      )
    )
  );

-- Users can send messages in channels they can access
CREATE POLICY "Users can send messages in accessible channels"
  ON public.messages FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND auth.uid() IS NOT NULL
    AND auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.channels
      WHERE channels.id = messages.channel_id
      AND channels.type = 'text'
      AND EXISTS (
        SELECT 1 FROM public.servers
        WHERE servers.id = channels.server_id
        AND (
          servers.is_public = true
          OR servers.owner_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.server_members
            WHERE server_members.server_id = servers.id
            AND server_members.user_id = auth.uid()
          )
        )
      )
    )
  );

-- Users can update their own messages
CREATE POLICY "Users can update their own messages"
  ON public.messages FOR UPDATE
  USING (auth.uid() IS NOT NULL AND auth.uid() = user_id)
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- Users can delete their own messages (or owners/admins can delete any)
CREATE POLICY "Users can delete their own messages"
  ON public.messages FOR DELETE
  USING (
    auth.uid() IS NOT NULL
    AND (
      auth.uid() = user_id
      OR EXISTS (
        SELECT 1 FROM public.channels
        WHERE channels.id = messages.channel_id
        AND EXISTS (
          SELECT 1 FROM public.servers
          WHERE servers.id = channels.server_id
          AND (
            servers.owner_id = auth.uid()
            OR EXISTS (
              SELECT 1 FROM public.server_members
              WHERE server_members.server_id = servers.id
              AND server_members.user_id = auth.uid()
              AND server_members.role IN ('owner', 'admin')
            )
          )
        )
      )
    )
  );

-- Create trigger for updated_at
CREATE TRIGGER on_message_updated
  BEFORE UPDATE ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Create indexes for performance
CREATE INDEX idx_messages_channel_id ON public.messages(channel_id);
CREATE INDEX idx_messages_user_id ON public.messages(user_id);
CREATE INDEX idx_messages_created_at ON public.messages(channel_id, created_at DESC);
```

## Next Steps

This schema will be extended in future MVPs:

- **MVP #4**: Profile System - Use the `profiles` table ✅
- **MVP #5**: Community Hubs - Add `servers` and `server_members` tables ✅
- **MVP #6**: Text Channels - Add `channels` table ✅
- **MVP #7**: Real-Time Messaging - Add `messages` table ✅
- **MVP #8**: Direct Messaging - Add `direct_messages` table
- And more...

## Notes

- All tables use UUID primary keys for better scalability
- Row Level Security (RLS) is enabled for all tables
- Timestamps use UTC timezone
- Automatic profile creation on user signup via trigger
- Automatic `updated_at` timestamp via trigger

