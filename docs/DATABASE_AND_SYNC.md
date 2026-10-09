# Database Schema & Offline SQLite Sync Engine

The Event Desk features a dual-layer data architecture: a cloud-hosted **PostgreSQL database (Supabase)** and a local **SQLite database (`expo-sqlite`)** allowing seamless offline registration and ticket issuance with manual or automatic cloud synchronization.

---

## 1. Supabase Database Schema

All tables are defined in [`supabase-schema.sql`](../supabase-schema.sql):

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
- `id` (UUID, Primary Key)
- `name` (TEXT)
- `code` (TEXT, Unique, e.g. `CH`, `CS`, `ME`, `EE`)
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
- `registered_by` (TEXT)
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

Located in [`src/services/sqliteStore.ts`](../src/services/sqliteStore.ts):
- Implements local SQLite database named `offline_eventdesk.db`.
- Mirrored tables: `local_registrations`, `local_batches`, `local_departments`, `local_sports`, and `sync_queue`.
- **`synced` Flag**: Every local record includes a `synced INTEGER DEFAULT 0` column. Newly registered students offline have `synced = 0`.

---

## 3. Bidirectional Cloud Sync Workflow

Users can tap the **Sync Button** in the top [`HeaderBar`](../src/components/HeaderBar.tsx):

```text
[Local SQLite]                       [Supabase Cloud]
      │                                     │
      ├───── 1. Upload unsynced (synced=0) ─┼───► Insert/Upsert into registrations
      │      records to Supabase            │
      │                                     │
      ├◄──── 2. Download latest batches, ───┤
      │      departments, sports & records  │
      │                                     │
      └───── 3. Mark uploaded records as ───┘
             synced = 1
```

If no internet connection is available, the sync safely reports a **Sync Notice** without interrupting user workflow or risking data loss.
