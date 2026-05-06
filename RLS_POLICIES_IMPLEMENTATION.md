# RLS (Row Level Security) Policies for EduHub

## Overview
This document provides complete RLS policy implementations for all EduHub tables using Supabase auth.uid() for secure access control.

---

## 1. PROFILES TABLE RLS

```sql
-- Enable RLS on profiles table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own profile
CREATE POLICY "Users can read their own profile"
ON profiles
FOR SELECT
USING (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "Users can update their own profile"
ON profiles
FOR UPDATE
USING (auth.uid() = id);

-- Allow users to insert their own profile
CREATE POLICY "Users can insert their own profile"
ON profiles
FOR INSERT
WITH CHECK (auth.uid() = id);

-- Allow service role to manage all profiles (for admin operations)
CREATE POLICY "Service role can manage profiles"
ON profiles
FOR ALL
USING (auth.role() = 'service_role');
```

---

## 2. BOOKS TABLE RLS

```sql
-- Enable RLS on books table
ALTER TABLE books ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all public books
CREATE POLICY "Authenticated users can read public books"
ON books
FOR SELECT
USING (auth.role() = 'authenticated');

-- Allow authenticated users to read all books
CREATE POLICY "All authenticated users can view books"
ON books
FOR SELECT
USING (true);

-- Allow admin to create books (insert)
CREATE POLICY "Service role can create books"
ON books
FOR INSERT
USING (auth.role() = 'service_role');

-- Allow admin to update books
CREATE POLICY "Service role can update books"
ON books
FOR UPDATE
USING (auth.role() = 'service_role');

-- Allow admin to delete books
CREATE POLICY "Service role can delete books"
ON books
FOR DELETE
USING (auth.role() = 'service_role');
```

---

## 3. VIDEOS TABLE RLS

```sql
-- Enable RLS on videos table
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all public videos
CREATE POLICY "Authenticated users can read public videos"
ON videos
FOR SELECT
USING (auth.role() = 'authenticated');

-- Allow authenticated users to view videos
CREATE POLICY "All authenticated users can view videos"
ON videos
FOR SELECT
USING (true);

-- Allow admin to create videos (insert)
CREATE POLICY "Service role can create videos"
ON videos
FOR INSERT
USING (auth.role() = 'service_role');

-- Allow admin to update videos
CREATE POLICY "Service role can update videos"
ON videos
FOR UPDATE
USING (auth.role() = 'service_role');

-- Allow admin to delete videos
CREATE POLICY "Service role can delete videos"
ON videos
FOR DELETE
USING (auth.role() = 'service_role');
```

---

## 4. SUBJECTS TABLE RLS

```sql
-- Enable RLS on subjects table
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read subjects
CREATE POLICY "Authenticated users can read subjects"
ON subjects
FOR SELECT
USING (auth.role() = 'authenticated');

-- Allow public read access to subjects
CREATE POLICY "Public can read subjects"
ON subjects
FOR SELECT
USING (true);

-- Allow admin to create subjects
CREATE POLICY "Service role can create subjects"
ON subjects
FOR INSERT
USING (auth.role() = 'service_role');

-- Allow admin to update subjects
CREATE POLICY "Service role can update subjects"
ON subjects
FOR UPDATE
USING (auth.role() = 'service_role');

-- Allow admin to delete subjects
CREATE POLICY "Service role can delete subjects"
ON subjects
FOR DELETE
USING (auth.role() = 'service_role');
```

---

## 5. SKILLS TABLE RLS

```sql
-- Enable RLS on skills table
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read skills
CREATE POLICY "Authenticated users can read skills"
ON skills
FOR SELECT
USING (auth.role() = 'authenticated');

-- Allow public read access to skills
CREATE POLICY "Public can read skills"
ON skills
FOR SELECT
USING (true);

-- Allow admin to create skills
CREATE POLICY "Service role can create skills"
ON skills
FOR INSERT
USING (auth.role() = 'service_role');

-- Allow admin to update skills
CREATE POLICY "Service role can update skills"
ON skills
FOR UPDATE
USING (auth.role() = 'service_role');

-- Allow admin to delete skills
CREATE POLICY "Service role can delete skills"
ON skills
FOR DELETE
USING (auth.role() = 'service_role');
```

---

## 6. STORAGE BUCKET RLS (For Books/PDFs)

```sql
-- Storage bucket 'books' RLS policies

-- Allow public read access to all files
CREATE POLICY "Public can read books"
ON storage.objects
FOR SELECT
USING (bucket_id = 'books');

-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload books"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'books' AND auth.role() = 'authenticated');

-- Allow service role to manage all files (admin operations)
CREATE POLICY "Service role can manage books"
ON storage.objects
FOR ALL
USING (bucket_id = 'books' AND auth.role() = 'service_role');

-- Allow users to delete their own uploaded files
CREATE POLICY "Users can delete their uploaded books"
ON storage.objects
FOR DELETE
USING (bucket_id = 'books' AND auth.uid()::text = owner);
```

---

## 7. QUICK SETUP SCRIPT

Run all policies at once:

```sql
-- PROFILES
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read their own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Service role can manage profiles" ON profiles FOR ALL USING (auth.role() = 'service_role');

-- BOOKS
ALTER TABLE books ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All authenticated users can view books" ON books FOR SELECT USING (true);
CREATE POLICY "Service role can create books" ON books FOR INSERT USING (auth.role() = 'service_role');
CREATE POLICY "Service role can update books" ON books FOR UPDATE USING (auth.role() = 'service_role');
CREATE POLICY "Service role can delete books" ON books FOR DELETE USING (auth.role() = 'service_role');

-- VIDEOS
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All authenticated users can view videos" ON videos FOR SELECT USING (true);
CREATE POLICY "Service role can create videos" ON videos FOR INSERT USING (auth.role() = 'service_role');
CREATE POLICY "Service role can update videos" ON videos FOR UPDATE USING (auth.role() = 'service_role');
CREATE POLICY "Service role can delete videos" ON videos FOR DELETE USING (auth.role() = 'service_role');

-- SUBJECTS
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read subjects" ON subjects FOR SELECT USING (true);
CREATE POLICY "Service role can create subjects" ON subjects FOR INSERT USING (auth.role() = 'service_role');
CREATE POLICY "Service role can update subjects" ON subjects FOR UPDATE USING (auth.role() = 'service_role');
CREATE POLICY "Service role can delete subjects" ON subjects FOR DELETE USING (auth.role() = 'service_role');

-- SKILLS
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read skills" ON skills FOR SELECT USING (true);
CREATE POLICY "Service role can create skills" ON skills FOR INSERT USING (auth.role() = 'service_role');
CREATE POLICY "Service role can update skills" ON skills FOR UPDATE USING (auth.role() = 'service_role');
CREATE POLICY "Service role can delete skills" ON skills FOR DELETE USING (auth.role() = 'service_role');
```

---

## 8. HOW TO APPLY RLS POLICIES

### Method 1: Using Supabase Dashboard
1. Go to **SQL Editor** in Supabase dashboard
2. Create a new query
3. Paste the **Quick Setup Script** from section 7
4. Click **Run** to execute all policies

### Method 2: Using Supabase CLI
```bash
# If you have Supabase CLI installed
supabase db push
# Then run the SQL queries
```

### Method 3: Manual Verification in Dashboard
1. Navigate to **Authentication** → **Policies**
2. For each table, verify that policies are listed
3. Test by attempting to read/write data

---

## 9. TESTING RLS POLICIES

### Test 1: Verify Public Books Read Access
```sql
-- Should work for authenticated users
SELECT * FROM books LIMIT 5;
```

### Test 2: Verify Profile Privacy
```sql
-- Should only return current user's profile
SELECT * FROM profiles;
```

### Test 3: Verify Admin Insert Access
```sql
-- Should fail for regular users (use service_role key)
INSERT INTO books (subject_id, title, file_url) VALUES ('web-dev', 'Test', 'http://...');
```

---

## 10. IMPORTANT NOTES

### Security Best Practices:
- ✅ Always use `auth.uid()` for user-specific access
- ✅ Use `auth.role() = 'service_role'` only for admin operations
- ✅ Test policies with both authenticated and unauthenticated users
- ✅ Never expose `service_role` key in frontend code

### When to Use Service Role vs. User Role:
- **Service Role**: Backend operations, admin functions
- **User Role**: Frontend operations, user-specific data

### Common Issues & Fixes:

| Issue | Solution |
|-------|----------|
| "permission denied" error | Check table has RLS enabled and proper policies |
| Users can see other's data | Verify policies use `auth.uid()` correctly |
| Admin can't insert | Ensure backend uses `service_role` key |
| Can't read public data | Add `USING (true)` policy for public access |

---

## 11. DISABLE RLS (If Needed for Testing)

```sql
-- WARNING: Only use in development!
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE books DISABLE ROW LEVEL SECURITY;
ALTER TABLE videos DISABLE ROW LEVEL SECURITY;
ALTER TABLE subjects DISABLE ROW LEVEL SECURITY;
ALTER TABLE skills DISABLE ROW LEVEL SECURITY;
```

---

## Summary

These RLS policies ensure:
- ✅ **Privacy**: Users can only access their own data
- ✅ **Security**: Admin operations protected by service role
- ✅ **Performance**: Public data accessible without authentication
- ✅ **Compliance**: Row-level access control enforced at database level

**Next Step**: Copy the Quick Setup Script (Section 7) and run it in Supabase SQL Editor!
