ALTER TABLE conditions
  ADD COLUMN uma_request_tx_hash CHAR(66),
  ADD COLUMN uma_request_log_index INTEGER,
  ADD COLUMN uma_oracle_address CHAR(42),
  ADD COLUMN mirror_uma_request_tx_hash CHAR(66),
  ADD COLUMN mirror_uma_request_log_index INTEGER,
  ADD COLUMN mirror_uma_oracle_address CHAR(42);
