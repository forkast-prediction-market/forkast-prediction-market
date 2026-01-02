-- Store market-level end time from Arweave metadata

ALTER TABLE markets
ADD COLUMN IF NOT EXISTS end_time TIMESTAMPTZ;
