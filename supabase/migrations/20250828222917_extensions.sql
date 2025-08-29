-- ============================================================
-- 0001_extensions.sql - Database Extensions
-- ============================================================
-- Enable required PostgreSQL extensions

-- Supabase provides common extensions by default (pgcrypto, uuid-ossp, etc.)

-- Create extensions schema first
CREATE SCHEMA IF NOT EXISTS extensions;

-- Create extensions in the extensions schema
create extension if not exists citext schema extensions;
create extension if not exists pg_cron schema extensions;
create extension if not exists pg_net schema extensions;
