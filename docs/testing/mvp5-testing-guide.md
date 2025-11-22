# MVP #5 Testing Guide: Community Hubs (Servers)

## Prerequisites

### 1. Database Setup
✅ Make sure you've run the `setup-servers.sql` script in Supabase SQL Editor

To verify:
1. Go to Supabase Dashboard → Table Editor
2. You should see:
   - `servers` table
   - `server_members` table

### 2. Application Running
```bash
npm run dev
```

The app should be running at http://localhost:3000

### 3. User Account
- You should have a user account (sign up at `/signup` if needed)
- Be logged in

---

## Testing Steps

### Test 1: Create a Server

1. **Navigate to Discover Page**
   - Go to http://localhost:3000/discover
   - Or click "Discover" in the navbar

2. **Click "Create Server" Button**
   - Should open a modal

3. **Fill in Server Details**
   - **Server Name**: Enter a name (e.g., "My Test Server")
   - **Description**: Enter a description (optional)
   - **Server Icon**: Click the avatar to upload an icon (optional)
   - **Public Server**: Toggle on/off (default: on)

4. **Click "Create Server"**
   - Should show success toast notification
   - Should redirect to the server detail page (`/servers/{id}`)
   - Should see your server information

**Expected Results:**
- ✅ Modal closes after creation
- ✅ Success message appears
- ✅ Redirects to server page
- ✅ Server name, description, and icon display correctly
- ✅ "Owner" badge appears
- ✅ Server appears in `/discover` page

---

### Test 2: View Server Details

1. **On Server Detail Page** (`/servers/{id}`)
   - Should see:
     - Server icon/avatar
     - Server name
     - Server description
     - "Owner" badge
     - Created date
     - Public/Private status

2. **Verify Information**
   - All details match what you entered
   - Avatar displays if uploaded

**Expected Results:**
- ✅ All server information displays correctly
- ✅ Owner badge is visible
- ✅ Created date is accurate

---

### Test 3: Discover Servers

1. **Navigate to Discover Page**
   - Go to http://localhost:3000/discover

2. **View Server List**
   - Should see all public servers
   - Should see your created server
   - Each server should show:
     - Server icon
     - Server name
     - Description (if provided)
     - Created date
     - Member count
     - Join/View button

3. **Check Server Cards**
   - Cards should be clickable
   - Hover effect should work
   - Information should be readable

**Expected Results:**
- ✅ Public servers are visible
- ✅ Server cards display correctly
- ✅ Can click on server cards to view details

---

### Test 4: Search Servers

1. **On Discover Page**
   - Find the search input field

2. **Search by Name**
   - Type part of a server name
   - Results should filter in real-time

3. **Search by Description**
   - Type part of a server description
   - Results should filter

4. **Clear Search**
   - Clear the search input
   - All servers should reappear

**Expected Results:**
- ✅ Search filters servers by name
- ✅ Search filters servers by description
- ✅ Clearing search shows all servers
- ✅ Search is case-insensitive

---

### Test 5: Join a Server

1. **Find a Server You're Not a Member Of**
   - On `/discover` page
   - Look for a server without "Member" or "Owner" badge
   - Should see "Join Server" button

2. **Click "Join Server"**
   - Button should show "Joining..." loading state
   - Should join successfully

3. **Verify Membership**
   - Badge should change to "Member"
   - "Join Server" button should disappear
   - "View Server" or "Leave Server" button should appear

4. **View Server Page**
   - Click on the server
   - Should see "Member" badge
   - Should see "Leave Server" button

**Expected Results:**
- ✅ Can join public servers
- ✅ Membership is recorded
- ✅ UI updates to show membership status
- ✅ Can view server details after joining

---

### Test 6: Leave a Server

1. **Navigate to a Server You're a Member Of**
   - Go to `/servers/{id}` for a server you joined
   - Should see "Member" badge
   - Should see "Leave Server" button

2. **Click "Leave Server"**
   - Button should show "Leaving..." loading state
   - Should leave successfully

3. **Verify**
   - Should redirect to `/discover` page
   - Server should no longer show "Member" badge
   - "Join Server" button should reappear

**Expected Results:**
- ✅ Can leave servers (except owned servers)
- ✅ Redirects to discover page
- ✅ Membership is removed
- ✅ UI updates correctly

---

### Test 7: Owner Actions

1. **View Your Owned Server**
   - Go to `/servers/{id}` for a server you created
   - Should see "Owner" badge

2. **Verify Owner Status**
   - Should NOT see "Leave Server" button
   - Should see "Owner" badge
   - Server should appear in your server list (future feature)

**Expected Results:**
- ✅ Owner badge displays
- ✅ Cannot leave owned servers
- ✅ Owner has full access

---

### Test 8: Multiple Servers

1. **Create Multiple Servers**
   - Create 2-3 different servers
   - Use different names and descriptions

2. **Verify All Appear**
   - Go to `/discover`
   - All your servers should appear
   - All should be searchable

3. **Join Multiple Servers**
   - Join different servers
   - Verify membership status for each

**Expected Results:**
- ✅ Can create multiple servers
- ✅ All servers appear in discover
- ✅ Can be member of multiple servers
- ✅ Membership status is correct for each

---

### Test 9: Server Icons

1. **Create Server with Icon**
   - Create a new server
   - Upload an icon image
   - Verify icon displays

2. **Create Server without Icon**
   - Create a server without icon
   - Should show default avatar with server name initial

**Expected Results:**
- ✅ Icons upload successfully
- ✅ Icons display on server cards
- ✅ Icons display on server detail page
- ✅ Default avatar shows when no icon

---

### Test 10: Public vs Private Servers

1. **Create Public Server**
   - Create server with "Public Server" toggle ON
   - Should appear in discover page
   - Others can join

2. **Create Private Server**
   - Create server with "Public Server" toggle OFF
   - Should still appear in discover (for now)
   - Note: Private server invite system will be in MVP #10

**Expected Results:**
- ✅ Public/private toggle works
- ✅ Public servers are discoverable
- ✅ Private servers exist (invite system coming later)

---

## Common Issues & Troubleshooting

### Issue: "Failed to create server"
**Solution:**
- Check database tables exist (`servers` and `server_members`)
- Verify RLS policies are set up
- Check browser console for errors
- Verify you're logged in

### Issue: "Cannot join server"
**Solution:**
- Verify server is public (`is_public = true`)
- Check RLS policies on `server_members` table
- Verify you're logged in
- Check browser console for errors

### Issue: "Server not appearing in discover"
**Solution:**
- Verify server `is_public = true`
- Check RLS policies on `servers` table
- Refresh the page
- Check browser console for errors

### Issue: "Icon not uploading"
**Solution:**
- Verify Supabase Storage bucket `avatars` exists
- Check storage policies are set up
- Verify file is under 5MB
- Check file type (JPEG, PNG, WebP, GIF)

### Issue: "Permission denied"
**Solution:**
- Verify RLS policies are correct
- Check user is authenticated
- Verify user has correct role/membership
- Check Supabase logs for policy violations

---

## Verification Checklist

After testing, verify:

- [ ] Can create servers
- [ ] Can view server details
- [ ] Can discover public servers
- [ ] Can search servers
- [ ] Can join servers
- [ ] Can leave servers (non-owned)
- [ ] Owner badge displays correctly
- [ ] Member badge displays correctly
- [ ] Server icons upload and display
- [ ] Public/private toggle works
- [ ] All UI elements are responsive
- [ ] No console errors
- [ ] No database errors

---

## Next Steps

Once MVP #5 is fully tested and working:
- ✅ Ready for MVP #6: Text Channel Management
- Channels will be created within servers
- Messages will be sent in channels

---

## Quick Test Script

Run through this quick test:

```bash
# 1. Start dev server
npm run dev

# 2. Open browser to http://localhost:3000

# 3. Login/Signup

# 4. Go to /discover

# 5. Create a server

# 6. View the server

# 7. Go back to /discover

# 8. Search for your server

# 9. Join another server (if available)

# 10. Leave the server you joined
```

If all steps work, MVP #5 is successfully tested! 🎉

