# Storage Policies - Step by Step Guide

## Overview
You need to create 4 policies for the `project-screenshots` bucket. Here's exactly how to do it.

---

## Policy 1: Allow Users to Upload Screenshots

### Steps:
1. In Supabase Dashboard, go to **Storage** (left sidebar)
2. Click on the `project-screenshots` bucket
3. Click the **Policies** tab at the top
4. Click **New Policy** button
5. Click **"For full customization create a policy from scratch"** (at the bottom)

### Fill in the form:

**Policy name:**
```
Users can upload screenshots
```

**Policy command:** Select `INSERT` from dropdown

**Target roles:** Select `authenticated` from dropdown

**USING expression:** Leave this field **EMPTY**

**WITH CHECK expression:** Paste this exactly:
```sql
(bucket_id = 'project-screenshots'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)
```

6. Click **Review** → **Save Policy**

✅ Policy 1 complete!

---

## Policy 2: Allow Public to View Screenshots

### Steps:
1. Click **New Policy** button again
2. Click **"For full customization create a policy from scratch"**

### Fill in the form:

**Policy name:**
```
Public can read screenshots
```

**Policy command:** Select `SELECT` from dropdown

**Target roles:** Select `public` from dropdown

**USING expression:** Paste this exactly:
```sql
bucket_id = 'project-screenshots'::text
```

**WITH CHECK expression:** Leave this field **EMPTY**

3. Click **Review** → **Save Policy**

✅ Policy 2 complete!

---

## Policy 3: Allow Users to Update Their Screenshots

### Steps:
1. Click **New Policy** button again
2. Click **"For full customization create a policy from scratch"**

### Fill in the form:

**Policy name:**
```
Users can update screenshots
```

**Policy command:** Select `UPDATE` from dropdown

**Target roles:** Select `authenticated` from dropdown

**USING expression:** Paste this exactly:
```sql
(bucket_id = 'project-screenshots'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)
```

**WITH CHECK expression:** Paste the **same thing** as USING:
```sql
(bucket_id = 'project-screenshots'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)
```

3. Click **Review** → **Save Policy**

✅ Policy 3 complete!

---

## Policy 4: Allow Users to Delete Their Screenshots

### Steps:
1. Click **New Policy** button again
2. Click **"For full customization create a policy from scratch"**

### Fill in the form:

**Policy name:**
```
Users can delete screenshots
```

**Policy command:** Select `DELETE` from dropdown

**Target roles:** Select `authenticated` from dropdown

**USING expression:** Paste this exactly:
```sql
(bucket_id = 'project-screenshots'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)
```

**WITH CHECK expression:** Leave this field **EMPTY**

3. Click **Review** → **Save Policy**

✅ Policy 4 complete!

---

## Verify All Policies

After creating all 4 policies, you should see this in the **Policies** tab:

```
✓ Users can upload screenshots       (INSERT - authenticated)
✓ Public can read screenshots         (SELECT - public)
✓ Users can update screenshots        (UPDATE - authenticated)
✓ Users can delete screenshots        (DELETE - authenticated)
```

---

## What Each Policy Does

### Policy 1 (INSERT - Users can upload)
- **Who**: Logged-in users
- **What**: Can upload new screenshots
- **Where**: Only to their own folder (`{userId}/...`)

### Policy 2 (SELECT - Public can read)
- **Who**: Anyone (even not logged in)
- **What**: Can view/download screenshots
- **Where**: All screenshots in the bucket

### Policy 3 (UPDATE - Users can update)
- **Who**: Logged-in users
- **What**: Can replace existing screenshots
- **Where**: Only their own screenshots

### Policy 4 (DELETE - Users can delete)
- **Who**: Logged-in users
- **What**: Can delete screenshots
- **Where**: Only their own screenshots

---

## Quick Reference: Copy-Paste Values

### Policy 1 (INSERT)
- Command: `INSERT`
- Role: `authenticated`
- USING: *(empty)*
- WITH CHECK: `(bucket_id = 'project-screenshots'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)`

### Policy 2 (SELECT)
- Command: `SELECT`
- Role: `public`
- USING: `bucket_id = 'project-screenshots'::text`
- WITH CHECK: *(empty)*

### Policy 3 (UPDATE)
- Command: `UPDATE`
- Role: `authenticated`
- USING: `(bucket_id = 'project-screenshots'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)`
- WITH CHECK: `(bucket_id = 'project-screenshots'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)`

### Policy 4 (DELETE)
- Command: `DELETE`
- Role: `authenticated`
- USING: `(bucket_id = 'project-screenshots'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)`
- WITH CHECK: *(empty)*

---

## Troubleshooting

### "Invalid expression" error
- Make sure you copied the expression **exactly** including all parentheses
- Check there are no extra spaces at the beginning or end
- Make sure you pasted into the correct field (USING vs WITH CHECK)

### Policy not showing up
- Refresh the page
- Check you clicked **Save Policy** (not just Review)

### Still getting permission errors
- Verify the bucket is set to **Public**
- Check all 4 policies are showing as enabled (green checkmark)
- Try uploading a test file manually via Dashboard

---

## Testing

After creating all policies, test by:

1. **Upload test**: Upload a file manually via Storage UI
2. **Access test**: Get the public URL and open in browser
3. **Generate project**: Create a new project and check if screenshot appears

If all works, you're done! 🎉
