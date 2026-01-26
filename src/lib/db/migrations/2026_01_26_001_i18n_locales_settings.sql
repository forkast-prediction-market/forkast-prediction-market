-- Insert default locale settings
INSERT INTO settings ("group", key, value)
VALUES ('i18n', 'enabled_locales', '["en","de","es","pt","fr","zh"]')
ON CONFLICT ("group", key) DO NOTHING;
