# Database Schema & Offline SQLite Sync Engine

The Event Desk features a robust dual-layer data architecture: a cloud-hosted **PostgreSQL database (Supabase)** and a local **SQLite database (`expo-sqlite`)** allowing seamless 100% offline operation (registration, QR pass verification, authentication, directory browsing, analytics, and admin management) with bidirectional cloud synchronization.

---

## 1. Supabase Cloud Database Schema (PostgreSQL)

All remote tables are defined in [`supabase-schema.sql`](../supabase-schema.sql):

### `app_users`
Stores system accounts (Super Admins & Moderators).
- `id` (UUID, Primary Key)
- `username` (TEXT, Unique, Case-Insensitive Index)
- `password_hash` (TEXT, SHA-256 with salt)
- `full_name` (TEXT)
- `role` (TEXT: `superadmin` | `moderator`)
- `is_active` (BOOLEAN, default `true`)
- `permissions` (JSONB, granular moderator capabilities)
- `created_at` (TIMESTAMPTZ)

### `batches`
Dynamic academic years/sessions (e.g. `2023`, `2024`, `2025`, `2026`).
- `year` (TEXT, Primary Key)
- `is_active` (BOOLEAN)

### `departments`
Academic departments.
- `code` (TEXT, Primary Key, e.g. `CH`, `CS`, `ME`, `EE`, `BBA`)
- `name` (TEXT)
- `description` (TEXT)
- `is_active` (BOOLEAN)

### `sports`
Events, sports, and registration fee schedule.
- `id` (UUID, Primary Key)
- `name` (TEXT)
- `code` (TEXT, Unique, e.g. `BADM`, `CRIC`, `FUTS`)
- `formats` (JSONB, e.g. `["Single (1v1)", "Doubles (2v2)"]`)
- `fee` (NUMERIC, base fee)
- `is_active` (BOOLEAN)

### `registrations`
Participant records & verified ticket tokens.
- `reg_no` (TEXT, Primary Key, formatted strictly as `YYYY-DEPT-ROLL`, e.g. `2024-CH-102`)
- `student_name` (TEXT)
- `phone` (TEXT)
- `email` (TEXT)
- `session_year` (TEXT)
- `department_code` (TEXT)
- `sport_id` (UUID)
- `sport_name` (TEXT)
- `category_format` (TEXT)
- `partner_name` (TEXT, optional for doubles/teams)
- `partner_reg_no` (TEXT, optional)
- `payment_status` (TEXT: `PAID`, `PARTIAL`, `FREE`, `UNPAID`)
- `total_fee` (NUMERIC)
- `paid_amount` (NUMERIC)
- `qr_token` (TEXT, Unique verified token)
- `checked_in` (BOOLEAN, default `false`)
- `checked_in_at` (TIMESTAMPTZ)
- `checked_in_by` (TEXT)
- `created_by_id` (TEXT)
- `created_by_username` (TEXT)
- `created_at` (TIMESTAMPTZ)

### `audit_logs`
Activity logging for compliance and moderation tracking.
- `id` (UUID, Primary Key)
- `action` (TEXT: `LOGIN`, `CREATE_REGISTRATION`, `CHECK_IN`, etc.)
- `entity_type` (TEXT)
- `entity_id` (TEXT)
- `performed_by_id` (UUID)
- `performed_by_username` (TEXT)
- `details` (JSONB)
- `created_at` (TIMESTAMPTZ)

---

## 2. Local SQLite Engine (`sqliteStore.ts`)

Located in [`src/services/sqliteStore.ts`](../src/services/sqliteStore.ts), the offline database is named **`eventdesk.db`** using `expo-sqlite` ~57.0.4.

### The 6 Local SQLite Tables

```sql
CREATE TABLE IF NOT EXISTS local_batches (
  year TEXT PRIMARY KEY,
  is_active INTEGER DEFAULT 1,
  synced INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS local_departments (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  is_active INTEGER DEFAULT 1,
  synced INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS local_sports (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  formats TEXT NOT NULL,
  fee REAL NOT NULL DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  synced INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS local_registrations (
  reg_no TEXT PRIMARY KEY,
  student_name TEXT NOT NULL,
  session_year TEXT NOT NULL,
  department_code TEXT NOT NULL,
  sport_id TEXT NOT NULL,
  sport_name TEXT NOT NULL,
  category_format TEXT NOT NULL,
  partner_name TEXT,
  partner_reg_no TEXT,
  payment_status TEXT NOT NULL,
  total_fee REAL NOT NULL,
  paid_amount REAL NOT NULL,
  phone TEXT,
  email TEXT,
  notes TEXT,
  qr_token TEXT NOT NULL,
  checked_in INTEGER DEFAULT 0,
  checked_in_at TEXT,
  checked_in_by TEXT,
  created_by_id TEXT,
  created_by_username TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT,
  synced INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS local_users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  is_active INTEGER DEFAULT 1,
  permissions TEXT,
  created_at TEXT NOT NULL,
  synced INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS local_audit_logs (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  performed_by_id TEXT,
  performed_by_username TEXT NOT NULL,
  details TEXT,
  created_at TEXT NOT NULL,
  synced INTEGER DEFAULT 0
);
```

---

## 3. Offline Authentication Workflow

Staff members frequently work in venues without WiFi or cellular data. To guarantee that authentication never fails offline:

1. **Online Login**:
   - Authenticates against Supabase `app_users`.
   - On success, saves user record and password hash to `local_users` with `synced = 1`.
2. **Offline Login**:
   - When Supabase is unreachable, `dataStore.authenticateUser()` queries `local_users`.
   - Verifies the entered password against `local_users.password_hash` using salted SHA-256.
   - If user is active, sets the authenticated session with their stored permissions.
3. **Admin Seed**:
   - Default Super Admin (`admin` / `Admin123!`) is automatically seeded into `local_users` during database initialization.

---

## 4. Bidirectional Cloud Sync Engine

Users trigger cloud synchronization via the **Cloud Sync Button** in the top [`HeaderBar`](../src/components/HeaderBar.tsx) or during background reconciliations:

```text
[Local SQLite]                                              [Supabase Cloud]
      │                                                            │
      ├───── 1. Upload Unsynced Registrations (synced=0) ──────────┼───► Upsert registrations
      │      Upload Unsynced Batches, Depts, Sports, Users, Logs   │
      │                                                            │
      ├◄──── 2. Download Remote Cloud Data ────────────────────────┤
      │      (Batches, Departments, Sports, Registrations, Users)  │
      │                                                            │
      ├───── 3. Conflict Safety Check ─────────────────────────────┤
      │      (DO NOT overwrite local records having synced = 0)    │
      │                                                            │
      └───── 4. Mark uploaded local records as synced = 1 ─────────┘
```

### Conflict Safety Rules
- When remote records are downloaded during sync, the engine inspects the local table first.
- If a record exists locally with `synced = 0` (meaning it has pending offline edits), the cloud record **will not overwrite** the local record.
- Once the local record is uploaded to Supabase, its flag is updated to `synced = 1`.
- The synchronization function returns exact metrics: `{ uploaded: number, downloaded: number }`, displayed to the user via a clean success alert.
