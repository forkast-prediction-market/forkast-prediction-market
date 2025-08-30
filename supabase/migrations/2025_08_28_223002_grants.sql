-- ============================================================
-- BROAD GRANTS - Foundation Permissions
-- ============================================================
-- Covers all tables and sequences for service role access
-- Domain-specific explicit grants moved to their respective files
-- ============================================================

-- Broad grants for all current and future tables
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT USAGE ON SCHEMA public TO service_role;

-- ============================================================
-- END OF BROAD GRANTS
-- Explicit grants moved to domain files for better organization
-- ============================================================
