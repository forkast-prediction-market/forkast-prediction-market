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
