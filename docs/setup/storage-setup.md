# Supabase Storage Setup for Avatars

This guide explains how to set up Supabase Storage for avatar uploads.

## Steps

### 1. Create Storage Bucket

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/tslzeujnqdwnufmtlt
2. Navigate to **Storage** in the left sidebar
3. Click **New bucket**
4. Configure the bucket:
   - **Name**: `avatars`
   - **Public bucket**: ✅ Enable (checked)
   - **File size limit**: 5 MB (or your preferred limit)
   - **Allowed MIME types**: `image/jpeg,image/png,image/webp,image/gif`

5. Click **Create bucket**

### 2. Set Up Storage Policies

After creating the bucket, you need to set up Row Level Security policies:

1. Go to **Storage** → **Policies** → Select `avatars` bucket
2. Click **New Policy**

#### Policy 1: Allow Public Read Access

- **Policy name**: `Public Avatar Access`
- **Allowed operation**: SELECT
- **Policy definition**:
  ```sql
  true
  ```
- **Description**: Allow anyone to view avatars

#### Policy 2: Allow Authenticated Users to Upload

- **Policy name**: `Authenticated Upload`
- **Allowed operation**: INSERT
- **Policy definition**:
  ```sql
  auth.role() = 'authenticated'
  ```
- **Description**: Allow authenticated users to upload avatars
- **Note**: You don't need `bucket_id = 'avatars'` because the policy is already scoped to the bucket you're creating it in

#### Policy 3: Allow Users to Update Their Own Avatars

- **Policy name**: `Update Own Avatar`
- **Allowed operation**: UPDATE
- **Policy definition**:
  ```sql
  auth.uid()::text = (storage.foldername(name))[1]
  ```
- **Description**: Users can only update avatars they uploaded (filename starts with their user ID)
- **Note**: This checks if the filename starts with the user's ID (our naming convention: `{userId}-{timestamp}.{ext}`)

#### Policy 4: Allow Users to Delete Their Own Avatars

- **Policy name**: `Delete Own Avatar`
- **Allowed operation**: DELETE
- **Policy definition**:
  ```sql
  auth.uid()::text = (storage.foldername(name))[1]
  ```
- **Description**: Users can only delete avatars they uploaded
- **Note**: This checks if the filename starts with the user's ID (our naming convention: `{userId}-{timestamp}.{ext}`)

### 3. Alternative: Simple Policy (Less Secure)

If you want a simpler setup for development, you can use:

**For all operations (SELECT, INSERT, UPDATE, DELETE)**:
```sql
auth.role() = 'authenticated'
```

⚠️ **Note**: This allows any authenticated user to modify any avatar. Use the more granular policies above for production.

## Testing

After setup, test the avatar upload:

1. Start your dev server: `npm run dev`
2. Log in to your account
3. Go to `/profile` or `/dashboard`
4. Click "Edit Profile"
5. Try uploading an avatar image

## Troubleshooting

### Upload Fails with "new row violates row-level security policy"

- Check that storage policies are correctly configured
- Verify the bucket name matches `avatars` in `src/lib/storage.ts`
- Ensure the user is authenticated

### Images Not Displaying

- Verify the bucket is set to **Public**
- Check that the SELECT policy allows public access
- Verify the avatar URL in the database is correct

### File Size Errors

- Check the bucket's file size limit
- Verify `MAX_FILE_SIZE` in `src/lib/storage.ts` matches your bucket settings

## File Naming Convention

Avatars are stored with the naming pattern:
```
{userId}-{timestamp}.{extension}
```

Example: `550e8400-e29b-41d4-a716-446655440000-1704067200000.jpg`

This ensures:
- Unique filenames
- Easy identification of file owner
- No filename conflicts

## Storage Limits

Supabase Free Tier includes:
- 1 GB of storage
- 2 GB bandwidth per month

For production, consider:
- Image optimization (already implemented client-side)
- CDN for faster delivery (Supabase provides this automatically)
- Monitoring storage usage

