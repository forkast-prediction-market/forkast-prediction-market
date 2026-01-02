-- Update default affiliate trade fee to 2.00%

UPDATE settings
SET value = '200'
WHERE "group" = 'affiliate'
  AND key = 'trade_fee_bps'
  AND value = '100';

INSERT INTO settings ("group", key, value)
VALUES ('affiliate', 'trade_fee_bps', '200')
ON CONFLICT ("group", key) DO NOTHING;
