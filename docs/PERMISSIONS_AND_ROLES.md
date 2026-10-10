# Permissions & Role-Based Access Control (RBAC)

The Society of Chemical Engineers Event Desk enforces strict role-based access control with granular permission flags for staff and volunteers.

---

## 1. Roles

The system recognizes two user roles (`UserRole`):

| Role | Access Level | Description |
| :--- | :--- | :--- |
| **`superadmin`** | Unrestricted Full Access | Can manage batches, departments, sports, moderators, configure permissions, edit/delete records, and view financial analytics. |
| **`moderator`** | Granular Restricted Access | Permissions assigned per user by a Super Admin. Only authorized tabs and actions are accessible. |

---

## 2. Granular Moderator Permissions

Moderators can be granted any combination of the following flags (`ModeratorPermissions`):

```typescript
export interface ModeratorPermissions {
  can_register: boolean;        // Register participants & issue QR passes
  can_view_records: boolean;    // View directory, filter records & see passes
  can_scan: boolean;            // Scan tickets and check-in attendees at venue
  can_view_analytics: boolean;  // View financial revenue, balances & charts
  can_export_csv: boolean;      // Download registration spreadsheets
}
```

### Default Permissions
When a moderator is created without custom flags, the default configuration is:
```typescript
export const DEFAULT_MODERATOR_PERMISSIONS: ModeratorPermissions = {
  can_register: true,
  can_view_records: false,
  can_scan: false,
  can_view_analytics: false,
  can_export_csv: false,
};
```

---

## 3. Tab Visibility & Route Protection

In [`src/app/(tabs)/_layout.tsx`](../src/app/(tabs)/_layout.tsx), tabs are protected dynamically:

```tsx
const hasRegister = can('can_register');
const hasRecords = can('can_view_records');
const hasScanner = can('can_scan');
const hasAnalytics = can('can_view_analytics');
```

- In Expo Router, setting `href: null` hides a tab button completely from the bottom navigation bar.
- If an unauthorized user attempts to navigate directly to a restricted route (e.g. `/records`, `/scanner`, `/analytics`, or `/admin`), the individual screen components render a clean **Access Restricted** card with an explanation and contact recommendation.

---

## 4. Multi-Layer Permission Persistence & Offline Authentication

Permissions and user credentials are preserved across three synchronized storage layers to guarantee immediate responsiveness and offline operation:

1. **Supabase Database (Cloud)**: Stored in the `permissions` JSONB column in `app_users`.
2. **Local SQLite Database (`eventdesk.db`)**:
   - Maintained in the `local_users` table with columns: `id`, `username`, `full_name`, `role`, `password_hash`, `is_active`, `permissions`, `created_at`, `synced`.
   - Allows users to **log in offline** without contacting Supabase.
   - Preserves offline edits with `synced = 0`.
3. **AsyncStorage Cache**:
   - Active session preserved under `@eventdesk_active_user_session`.
   - Individual user permission overrides stored under `@eventdesk_perms_${username.toLowerCase()}` to ensure Super Admin permission modifications apply immediately on the moderator's next session.
