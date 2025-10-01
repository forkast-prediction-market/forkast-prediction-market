BEGIN;

-- ============================================================
-- UTILITY FUNCTIONS - Database Helper Functions
-- ============================================================
-- Functions: lower_user_fields(), update_updated_at_column()
-- Dependencies: None (utility layer)
-- Usage: Triggers for data normalization and timestamp management
-- ============================================================

CREATE OR REPLACE FUNCTION lower_user_fields()
  RETURNS TRIGGER
  SET search_path = 'public'
AS
$$
BEGIN
  NEW.email := LOWER(NEW.email);
  NEW.username := LOWER(NEW.username);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_updated_at_column()
  RETURNS TRIGGER
  SET search_path = 'public'
AS
$$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

COMMIT;
