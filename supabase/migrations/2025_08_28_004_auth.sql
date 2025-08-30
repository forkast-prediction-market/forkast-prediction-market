-- ============================================================
-- AUTH & USERS - Complete Domain Implementation
-- ============================================================
-- Tables: users, sessions, accounts, verifications, wallets
-- Dependencies: None (independent domain)
-- Integration: Better Auth (SIWE) for Web3 authentication
-- ============================================================

-- ===========================================
-- 1. TABLE CREATION
-- ===========================================

-- Users table - Core user identity
CREATE TABLE IF NOT EXISTS users
(
  id             INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  address        TEXT NOT NULL,
  username       TEXT NOT NULL,
  email          TEXT NOT NULL,
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  image          TEXT,
  settings       JSONB   NOT NULL DEFAULT '{}'::JSONB,
  created_at     TIMESTAMPTZ      DEFAULT NOW(),
  updated_at     TIMESTAMPTZ      DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_address_lower ON users (LOWER(address));
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users (username);

-- Sessions table - Better Auth session management
CREATE TABLE IF NOT EXISTS sessions
(
  id         INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  expires_at TIMESTAMPTZ NOT NULL,
  token      TEXT        NOT NULL UNIQUE,
  ip_address TEXT,
  user_agent TEXT,
  user_id    INTEGER     NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions (token);

-- Accounts table - OAuth/social login accounts
CREATE TABLE IF NOT EXISTS accounts
(
  id                       INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  account_id               TEXT    NOT NULL,
  provider_id              TEXT    NOT NULL,
  user_id                  INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  access_token             TEXT,
  refresh_token            TEXT,
  id_token                 TEXT,
  access_token_expires_at  TIMESTAMPTZ,
  refresh_token_expires_at TIMESTAMPTZ,
  scope                    TEXT,
  password                 TEXT,
  created_at               TIMESTAMPTZ DEFAULT NOW(),
  updated_at               TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_accounts_token ON accounts (user_id);

-- Verifications table - Email/SIWE verification tokens
CREATE TABLE IF NOT EXISTS verifications
(
  id         INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  identifier TEXT      NOT NULL,
  value      TEXT      NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_verifications_identifier ON verifications (identifier);

-- Wallets table - User Web3 wallet connections
CREATE TABLE IF NOT EXISTS wallets
(
  id         INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  address    TEXT    NOT NULL,
  balance    DECIMAL(20, 6) DEFAULT 0,
  chain_id   INTEGER NOT NULL,
  is_primary BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ    DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wallets_token ON wallets (user_id);

-- ===========================================
-- 2. ROW LEVEL SECURITY
-- ===========================================

-- Enable RLS on all auth tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;

-- ===========================================
-- 3. SECURITY POLICIES
-- ===========================================

-- Users policies
DO $$
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_all_users' AND tablename = 'users') THEN
      CREATE POLICY "service_role_all_users" ON users FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
    END IF;
  END
$$;

-- Sessions policies
DO $$
  BEGIN
    IF NOT EXISTS (SELECT 1
                   FROM pg_policies
                   WHERE policyname = 'service_role_all_sessions' AND tablename = 'sessions') THEN
      CREATE POLICY "service_role_all_sessions" ON sessions FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
    END IF;
  END
$$;

-- Accounts policies
DO $$
  BEGIN
    IF NOT EXISTS (SELECT 1
                   FROM pg_policies
                   WHERE policyname = 'service_role_all_accounts' AND tablename = 'accounts') THEN
      CREATE POLICY "service_role_all_accounts" ON accounts FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
    END IF;
  END
$$;

-- Verifications policies
DO $$
  BEGIN
    IF NOT EXISTS (SELECT 1
                   FROM pg_policies
                   WHERE policyname = 'service_role_all_verifications' AND tablename = 'verifications') THEN
      CREATE POLICY "service_role_all_verifications" ON verifications FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
    END IF;
  END
$$;

-- Wallets policies
DO $$
  BEGIN
    IF NOT EXISTS (SELECT 1
                   FROM pg_policies
                   WHERE policyname = 'service_role_all_wallets' AND tablename = 'wallets') THEN
      CREATE POLICY "service_role_all_wallets" ON wallets FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
    END IF;
  END
$$;

-- ===========================================
-- 4. TRIGGERS
-- ===========================================

-- Function for automatic updated_at (shared with blockchain domain)
CREATE OR REPLACE FUNCTION update_updated_at_column()
  RETURNS TRIGGER
  SET search_path = 'public'
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- Updated_at triggers for auth tables
DO $$
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_users_updated_at') THEN
      CREATE TRIGGER update_users_updated_at
        BEFORE UPDATE
        ON users
        FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
    END IF;
  END
$$;

DO $$
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_sessions_updated_at') THEN
      CREATE TRIGGER update_sessions_updated_at
        BEFORE UPDATE
        ON sessions
        FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
    END IF;
  END
$$;

DO $$
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_accounts_updated_at') THEN
      CREATE TRIGGER update_accounts_updated_at
        BEFORE UPDATE
        ON accounts
        FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
    END IF;
  END
$$;

DO $$
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_verifications_updated_at') THEN
      CREATE TRIGGER update_verifications_updated_at
        BEFORE UPDATE
        ON verifications
        FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
    END IF;
  END
$$;

-- ===========================================
-- 5. GRANTS
-- ===========================================

-- Explicit grants for critical auth tables (security priority)
GRANT ALL ON users TO service_role;
GRANT ALL ON sessions TO service_role;
GRANT ALL ON accounts TO service_role;
GRANT ALL ON verifications TO service_role;
GRANT ALL ON wallets TO service_role;

-- ============================================================
-- END OF AUTH & USERS MIGRATION
-- ============================================================
