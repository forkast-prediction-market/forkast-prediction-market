-- 006.undo.sql - Remove Supabase Storage Bucket Setup
-- Removes storage bucket and policies

-- Drop storage policies
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role full access' AND tablename = 'objects' AND schemaname = 'storage') THEN
        DROP POLICY "Service role full access" ON storage.objects;
    END IF;
END
$$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public read access' AND tablename = 'objects' AND schemaname = 'storage') THEN
        DROP POLICY "Public read access" ON storage.objects;
    END IF;
END
$$;

-- Remove bucket
DELETE FROM storage.buckets WHERE id = 'forkast-assets';
