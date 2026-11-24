CREATE TABLE IF NOT EXISTS tenants (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 0
) STRICT;
CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL, email TEXT UNIQUE NOT NULL COLLATE NOCASE,
  password TEXT NOT NULL, created_at INTEGER NOT NULL
) STRICT;
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY, account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL
) STRICT;
CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS accounts_tenant ON accounts(tenant_id);
CREATE TABLE IF NOT EXISTS workspace_records (
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  collection TEXT NOT NULL, content TEXT NOT NULL CHECK(json_valid(content)),
  PRIMARY KEY(tenant_id, collection)
) STRICT;
CREATE TABLE IF NOT EXISTS login_attempts (
  key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires_at INTEGER NOT NULL
) STRICT;
