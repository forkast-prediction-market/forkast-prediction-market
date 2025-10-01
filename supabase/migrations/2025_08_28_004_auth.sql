BEGIN;

-- ============================================================
-- AUTH & USERS - Complete Domain Implementation
-- ============================================================
-- Tables: users, sessions, accounts, verifications, wallets, two_factors
-- Dependencies: None (independent domain)
-- Integration: Better Auth (SIWE) for Web3 authentication
-- ============================================================

-- ===========================================
-- 1. TABLE CREATION
-- ===========================================

-- Users table - Core user identity with affiliate functionality
CREATE TABLE IF NOT EXISTS users
(
  id                  CHAR(26) PRIMARY KEY DEFAULT generate_ulid(),
  address             TEXT        NOT NULL UNIQUE,
  username            TEXT,
  email               TEXT        NOT NULL,
  email_verified      BOOLEAN     NOT NULL DEFAULT FALSE,
  two_factor_enabled  BOOLEAN     NOT NULL DEFAULT FALSE,
  image               TEXT,
  settings            JSONB       NOT NULL DEFAULT '{}'::JSONB,
  affiliate_code      TEXT,                                                 -- Unique referral code for this user
  referred_by_user_id CHAR(26)    REFERENCES users (id) ON DELETE SET NULL, -- User who referred this user
  referred_at         TIMESTAMPTZ,                                          -- When the referral occurred
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users (LOWER(email));
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users (LOWER(username));
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_affiliate_code ON users (LOWER(affiliate_code));

-- Sessions table - Better Auth session management
CREATE TABLE IF NOT EXISTS sessions
(
  id         CHAR(26) PRIMARY KEY DEFAULT generate_ulid(),
  expires_at TIMESTAMPTZ NOT NULL,
  token      TEXT        NOT NULL UNIQUE,
  ip_address TEXT,
  user_agent TEXT,
  user_id    CHAR(26)    NOT NULL REFERENCES users (id) ON DELETE CASCADE ON UPDATE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions (user_id);

-- Accounts table - OAuth/social login accounts
CREATE TABLE IF NOT EXISTS accounts
(
  id                       CHAR(26) PRIMARY KEY DEFAULT generate_ulid(),
  account_id               TEXT        NOT NULL,
  provider_id              TEXT        NOT NULL,
  user_id                  CHAR(26)    NOT NULL REFERENCES users (id) ON DELETE CASCADE ON UPDATE CASCADE,
  access_token             TEXT,
  refresh_token            TEXT,
  id_token                 TEXT,
  access_token_expires_at  TIMESTAMPTZ,
  refresh_token_expires_at TIMESTAMPTZ,
  scope                    TEXT,
  password                 TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts (user_id);

-- Verifications table - Email/SIWE verification tokens
CREATE TABLE IF NOT EXISTS verifications
(
  id         CHAR(26) PRIMARY KEY DEFAULT generate_ulid(),
  identifier TEXT        NOT NULL,
  value      TEXT        NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_verifications_identifier ON verifications (identifier);

-- Wallets table - User Web3 wallet connections
CREATE TABLE IF NOT EXISTS wallets
(
  id         CHAR(26) PRIMARY KEY DEFAULT generate_ulid(),
  user_id    CHAR(26)    NOT NULL REFERENCES users (id) ON DELETE CASCADE ON UPDATE CASCADE,
  address    TEXT        NOT NULL,
  chain_id   INTEGER     NOT NULL,
  is_primary BOOLEAN     NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets (user_id);

-- two-factor authentication table
CREATE TABLE two_factors
(
  id           CHAR(26) NOT NULL DEFAULT generate_ulid(),
  secret       TEXT,
  backup_codes TEXT,
  user_id      CHAR(26) NOT NULL REFERENCES users (id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_two_factors_user_id ON two_factors (user_id);

-- ===========================================
-- 2. ROW LEVEL SECURITY
-- ===========================================

-- Enable RLS on all auth tables
ALTER TABLE users
  ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions
  ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts
  ENABLE ROW LEVEL SECURITY;
ALTER TABLE verifications
  ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets
  ENABLE ROW LEVEL SECURITY;
ALTER TABLE two_factors
  ENABLE ROW LEVEL SECURITY;

-- ===========================================
-- 3. SECURITY POLICIES
-- ===========================================

-- Users policies
DO
$$
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_all_users' AND tablename = 'users') THEN
      CREATE POLICY "service_role_all_users" ON users FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
    END IF;
  END
$$;

-- Sessions policies
DO
$$
  BEGIN
    IF NOT EXISTS (SELECT 1
                   FROM pg_policies
                   WHERE policyname = 'service_role_all_sessions'
                     AND tablename = 'sessions') THEN
      CREATE POLICY "service_role_all_sessions" ON sessions FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
    END IF;
  END
$$;

-- Accounts policies
DO
$$
  BEGIN
    IF NOT EXISTS (SELECT 1
                   FROM pg_policies
                   WHERE policyname = 'service_role_all_accounts'
                     AND tablename = 'accounts') THEN
      CREATE POLICY "service_role_all_accounts" ON accounts FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
    END IF;
  END
$$;

-- Verifications policies
DO
$$
  BEGIN
    IF NOT EXISTS (SELECT 1
                   FROM pg_policies
                   WHERE policyname = 'service_role_all_verifications'
                     AND tablename = 'verifications') THEN
      CREATE POLICY "service_role_all_verifications" ON verifications FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
    END IF;
  END
$$;

-- Wallets policies
DO
$$
  BEGIN
    IF NOT EXISTS (SELECT 1
                   FROM pg_policies
                   WHERE policyname = 'service_role_all_wallets'
                     AND tablename = 'wallets') THEN
      CREATE POLICY "service_role_all_wallets" ON wallets FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
    END IF;
  END
$$;

-- two-factor policies
DO
$$
  BEGIN
    IF NOT EXISTS (SELECT 1
                   FROM pg_policies
                   WHERE policyname = 'service_role_all_two_factors'
                     AND tablename = 'two_factors') THEN
      CREATE POLICY "service_role_all_two_factors" ON two_factors FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
    END IF;
  END
$$;

-- ===========================================
-- 4. TRIGGERS
-- ===========================================

-- Updated_at triggers for auth tables
DO
$$
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

DO
$$
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

DO
$$
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

DO
$$
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

COMMIT;
