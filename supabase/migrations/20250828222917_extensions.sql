-- ============================================================
-- 0001_extensions.sql - Database Extensions
-- ============================================================
-- Enable required PostgreSQL extensions

-- Supabase provides common extensions by default (pgcrypto, uuid-ossp, etc.)

create extension if not exists citext;
create extension if not exists pg_cron;
create extension if not exists pg_net;
