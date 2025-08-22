-- 001.undo.sql - Rollback Initial Database Schema
-- Removes all tables created in 001.do.sql

-- Drop in reverse order of creation to handle foreign key dependencies

-- Drop main tables
DROP TABLE IF EXISTS outcomes CASCADE;
DROP TABLE IF EXISTS markets CASCADE;
DROP TABLE IF EXISTS event_tags CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS tags CASCADE;

-- Drop sync status table
DROP TABLE IF EXISTS sync_status CASCADE;

-- Drop wallet tables
DROP TABLE IF EXISTS global_usdc_balance CASCADE;
DROP TABLE IF EXISTS wallets CASCADE;

-- Drop FPMM tables
DROP TABLE IF EXISTS fpmm_pool_memberships CASCADE;
DROP TABLE IF EXISTS fpmms CASCADE;
DROP TABLE IF EXISTS collaterals CASCADE;

-- Drop sports oracle tables
DROP TABLE IF EXISTS sports_markets CASCADE;
DROP TABLE IF EXISTS sports_games CASCADE;

-- Drop resolution tables
DROP TABLE IF EXISTS market_resolutions CASCADE;

-- Drop position activity tables
DROP TABLE IF EXISTS redemptions CASCADE;
DROP TABLE IF EXISTS position_merges CASCADE;
DROP TABLE IF EXISTS position_splits CASCADE;

-- Drop interest tables
DROP TABLE IF EXISTS global_open_interest CASCADE;
DROP TABLE IF EXISTS market_open_interest CASCADE;

-- Drop order tables
DROP TABLE IF EXISTS orders_matched_global CASCADE;
DROP TABLE IF EXISTS order_fills CASCADE;

-- Drop position balances
DROP TABLE IF EXISTS user_position_balances CASCADE;

-- Drop conditions table (base table)
DROP TABLE IF EXISTS conditions CASCADE;
