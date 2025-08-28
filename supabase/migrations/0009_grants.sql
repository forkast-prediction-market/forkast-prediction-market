-- ============================================================
-- 0009_grants.sql - Service Role Permissions
-- ============================================================
-- Critical grants for service role access
-- Note: Service role policies are defined in 0008_policies.sql

-- ============================================================
-- 🔑 CRITICAL: GRANT PERMISSIONS TO SERVICE ROLE
-- ============================================================
-- This is essential for sync operations to work properly
-- RLS policies alone are not sufficient for service_role access

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT USAGE ON SCHEMA public TO service_role;

-- Additional explicit grants for auth tables
GRANT ALL ON users TO service_role;
GRANT ALL ON sessions TO service_role;
GRANT ALL ON accounts TO service_role;
GRANT ALL ON verifications TO service_role;
GRANT ALL ON bookmarks TO service_role;
