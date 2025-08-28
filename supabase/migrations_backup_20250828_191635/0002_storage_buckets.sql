-- ============================================================
-- 0002_storage_buckets.sql - Storage Bucket Setup
-- ============================================================
-- Create storage buckets for assets

-- Create bucket for assets
INSERT INTO storage.buckets (id, name, public)
VALUES ('forkast-assets', 'forkast-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Public read access for all files
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'Public read access' 
        AND tablename = 'objects' 
        AND schemaname = 'storage'
    ) THEN 
        CREATE POLICY "Public read access" ON storage.objects 
        FOR SELECT TO public 
        USING (bucket_id = 'forkast-assets');
    END IF;
END $$;

-- Service role full access (for sync scripts)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'Service role full access' 
        AND tablename = 'objects' 
        AND schemaname = 'storage'
    ) THEN 
        CREATE POLICY "Service role full access" ON storage.objects 
        FOR ALL TO service_role 
        USING (bucket_id = 'forkast-assets') 
        WITH CHECK (bucket_id = 'forkast-assets');
    END IF;
END $$;
