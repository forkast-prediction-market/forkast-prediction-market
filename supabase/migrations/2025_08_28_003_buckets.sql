-- ============================================================
-- STORAGE BUCKETS - Single Bucket Setup
-- ============================================================
-- Bucket: forkast-assets (single bucket for all assets)
-- Access: Public read, service role full access
-- Organization: Folder-based structure within bucket
-- ============================================================

-- ===========================================
-- 1. STORAGE BUCKET CREATION
-- ===========================================

-- Create main assets bucket with size and type restrictions
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('forkast-assets',
        'forkast-assets',
        TRUE,
        2097152,
        ARRAY ['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- ===========================================
-- 2. STORAGE POLICIES
-- ===========================================

-- ===========================================
-- PUBLIC READ ACCESS
-- ===========================================

-- Public read access for all assets (branding, icons, public content)
DO
$$
  BEGIN
    IF NOT EXISTS (SELECT 1
                   FROM pg_policies
                   WHERE policyname = 'Public read forkast assets'
                     AND tablename = 'objects'
                     AND schemaname = 'storage') THEN
      CREATE POLICY "Public read forkast assets" ON storage.objects
        FOR SELECT TO PUBLIC
        USING (bucket_id = 'forkast-assets');
    END IF;
  END
$$;

-- ===========================================
-- SERVICE ROLE ACCESS
-- ===========================================

-- Service role full access (for sync scripts and automated uploads)
DO
$$
  BEGIN
    IF NOT EXISTS (SELECT 1
                   FROM pg_policies
                   WHERE policyname = 'Service role full asset access'
                     AND tablename = 'objects'
                     AND schemaname = 'storage') THEN
      CREATE POLICY "Service role full asset access" ON storage.objects
        FOR ALL TO service_role
        USING (bucket_id = 'forkast-assets')
        WITH CHECK (bucket_id = 'forkast-assets');
    END IF;
  END
$$;
