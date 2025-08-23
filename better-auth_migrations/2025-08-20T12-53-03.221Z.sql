create table "users"
(
  "id"             text                                not null primary key,
  "address"        text unique,
  "username"       text unique,
  "email"          text                                not null unique,
  "email_verified" boolean                             not null default false,
  "bio"            text,
  "image"          text,
  "created_at"     timestamp default current_timestamp not null,
  "updated_at"     timestamp default current_timestamp not null
);

create table "sessions"
(
  "id"         text      not null primary key,
  "expires_at" timestamp not null,
  "token"      text      not null unique,
  "ip_address" text,
  "user_agent" text,
  "user_id"    text      not null references "users" ("id") on delete cascade,
  "created_at" timestamp not null,
  "updated_at" timestamp not null
);

create table "accounts"
(
  "id"                       text      not null primary key,
  "account_id"               text      not null,
  "provider_id"              text      not null,
  "user_id"                  text      not null references "users" ("id") on delete cascade,
  "access_token"             text,
  "refresh_token"            text,
  "id_token"                 text,
  "access_token_expires_at"  timestamp,
  "refresh_token_expires_at" timestamp,
  "scope"                    text,
  "password"                 text,
  "created_at"               timestamp not null,
  "updated_at"               timestamp not null
);

create table "verifications"
(
  "id"         text      not null primary key,
  "identifier" text      not null,
  "value"      text      not null,
  "expires_at" timestamp not null,
  "created_at" timestamp default current_timestamp,
  "updated_at" timestamp default current_timestamp
);

create table "wallet_address"
(
  "id"         text      not null primary key,
  "user_id"    text      not null references "users" ("id") on delete cascade,
  "address"    text      not null,
  "chain_id"   integer   not null,
  "is_primary" boolean   not null,
  "created_at" timestamp not null
);

grant all privileges on table "users" to service_role;
