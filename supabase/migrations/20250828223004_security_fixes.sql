-- ============================================================
-- 0011_security_fixes.sql - Security fixes for linting issues
-- ============================================================
-- Fix security issues identified by Supabase database linter

-- Create a separate schema for extensions to improve security
CREATE SCHEMA IF NOT EXISTS extensions;

-- Move extensions to the extensions schema
DO $$
BEGIN
  -- Move citext extension if it exists in public
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'citext' AND extnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) THEN
    ALTER EXTENSION citext SET SCHEMA extensions;
  END IF;

  -- Move pg_net extension if it exists in public
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net' AND extnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) THEN
    ALTER EXTENSION pg_net SET SCHEMA extensions;
  END IF;
END $$;

-- Create a separate schema for internal system tables
CREATE SCHEMA IF NOT EXISTS supabase_internal;

-- Move migrations table to supabase_internal schema and enable RLS
DO $$
BEGIN
  -- Move the table if it exists in public
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'migrations' AND table_schema = 'public') THEN
    ALTER TABLE public.migrations SET SCHEMA supabase_internal;
  END IF;
END $$;

-- Enable RLS on the migrations table in its new schema
ALTER TABLE supabase_internal.migrations ENABLE ROW LEVEL SECURITY;

-- Create a policy that denies all access to migrations table (internal use only)
CREATE POLICY "Deny all access to migrations" ON supabase_internal.migrations
  FOR ALL
  USING (false)
  WITH CHECK (false);
