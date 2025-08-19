-- ============================================================
-- 🔐 BETTER AUTH + SIWE SCHEMA
-- ============================================================
-- Schema adicional para Better Auth com plugin SIWE
-- Para ser executado APÓS o supabase-schema.sql existente

-- Better Auth core tables
CREATE TABLE IF NOT EXISTS user (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE,
    emailVerified BOOLEAN DEFAULT FALSE,
    name TEXT,
    image TEXT,
    createdAt TIMESTAMPTZ DEFAULT NOW(),
    updatedAt TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS session (
    id TEXT PRIMARY KEY,
    expiresAt TIMESTAMPTZ NOT NULL,
    token TEXT UNIQUE NOT NULL,
    createdAt TIMESTAMPTZ DEFAULT NOW(),
    updatedAt TIMESTAMPTZ DEFAULT NOW(),
    ipAddress TEXT,
    userAgent TEXT,
    userId TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS account (
    id TEXT PRIMARY KEY,
    accountId TEXT NOT NULL,
    providerId TEXT NOT NULL,
    userId TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
    accessToken TEXT,
    refreshToken TEXT,
    idToken TEXT,
    accessTokenExpiresAt TIMESTAMPTZ,
    refreshTokenExpiresAt TIMESTAMPTZ,
    scope TEXT,
    password TEXT,
    createdAt TIMESTAMPTZ DEFAULT NOW(),
    updatedAt TIMESTAMPTZ DEFAULT NOW()
);

-- SIWE specific extension to user table
ALTER TABLE user ADD COLUMN IF NOT EXISTS wallet_address VARCHAR(42) UNIQUE;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_wallet_address ON user(wallet_address);
CREATE INDEX IF NOT EXISTS idx_session_user_id ON session(userId);
CREATE INDEX IF NOT EXISTS idx_session_token ON session(token);
CREATE INDEX IF NOT EXISTS idx_account_user_id ON account(userId);
CREATE INDEX IF NOT EXISTS idx_account_provider ON account(providerId, accountId);

-- Better Auth permissions
GRANT ALL PRIVILEGES ON user TO service_role;
GRANT ALL PRIVILEGES ON session TO service_role;
GRANT ALL PRIVILEGES ON account TO service_role;

-- Enable RLS
ALTER TABLE user ENABLE ROW LEVEL SECURITY;
ALTER TABLE session ENABLE ROW LEVEL SECURITY;
ALTER TABLE account ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can see own data" ON user 
  FOR SELECT TO authenticated USING (id = auth.uid()::text);

CREATE POLICY "Users can update own data" ON user 
  FOR UPDATE TO authenticated USING (id = auth.uid()::text);

CREATE POLICY "Sessions are private" ON session 
  FOR ALL TO authenticated USING (userId = auth.uid()::text);

CREATE POLICY "Accounts are private" ON account 
  FOR ALL TO authenticated USING (userId = auth.uid()::text);

-- Service role full access
CREATE POLICY "Service role full access user" ON user FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access session" ON session FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access account" ON account FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Function to sync wallet_address with wallets table
CREATE OR REPLACE FUNCTION sync_user_wallet()
RETURNS TRIGGER 
SET search_path = 'public'
AS $$
BEGIN
    -- When user is created with wallet_address, ensure it exists in wallets table
    IF NEW.wallet_address IS NOT NULL THEN
        INSERT INTO wallets (id, signer, wallet_type, created_at)
        VALUES (NEW.wallet_address, NEW.wallet_address, 'proxy', NEW.createdAt)
        ON CONFLICT (id) DO NOTHING;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to sync wallet data
CREATE TRIGGER trigger_sync_user_wallet
    AFTER INSERT OR UPDATE ON user
    FOR EACH ROW EXECUTE FUNCTION sync_user_wallet();

-- Updated RLS policy for user_position_balances to work with Better Auth
DROP POLICY IF EXISTS "Users can see own positions" ON user_position_balances;
CREATE POLICY "Users can see own positions" ON user_position_balances 
  FOR SELECT TO authenticated USING (
    user_address = (SELECT wallet_address FROM user WHERE id = auth.uid()::text)
  );
