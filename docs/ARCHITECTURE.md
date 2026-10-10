# System Architecture Overview

This document describes the software architecture, state flow, responsive layout engine, offline data pipeline, and core design principles for the **Society of Chemical Engineers (SCE) Event Desk** application.

---

## 1. Technology Stack

- **Framework**: [Expo SDK 57](https://expo.dev) with React Native `0.86.3` and React `19.2.3`.
- **Navigation**: [Expo Router v5](https://docs.expo.dev/router/introduction/) (typed routes enabled, file-based routing in `src/app/`).
- **Data Layers**:
  - **Remote**: [Supabase](https://supabase.com) (PostgreSQL with Row Level Security, REST API via `@supabase/supabase-js`).
  - **Local/Offline**: [expo-sqlite](https://docs.expo.dev/versions/latest/sdk/sqlite/) (`eventdesk.db` ~57.0.4 synchronous API) with 6 mirrored tables (`local_batches`, `local_departments`, `local_sports`, `local_registrations`, `local_users`, `local_audit_logs`) and bidirectional synchronization.
  - **Client Storage**: `@react-native-async-storage/async-storage` for active sessions, user preferences, and permission overrides.
- **Hardware & Native Modules**:
  - Camera QR Scanning: `expo-camera` (`CameraView`).
  - File System & Sharing: `expo-file-system/legacy`, `expo-sharing`, `expo-print`.
- **Responsive Layout**: Custom scaling engine (`src/theme/responsive.ts`) and modular UI library (`src/components/ui/`).
- **Unit Testing**: Node.js native test runner (`node:test`, `node:assert`, `node:sqlite`) with 11 automated test suites (`npm test`).
- **Typography & Icons**: `@expo/vector-icons/Ionicons`.

---

## 2. Directory Structure

```text
Event-Desk/
├── app.json                  # Expo application configuration & plugins
├── eas.json                  # EAS Build configuration for APK / AAB
├── supabase-schema.sql       # Full PostgreSQL database schema & initial seeds
├── tests/
│   └── unit_tests.mjs        # 11 comprehensive automated unit test suites
├── scripts/
│   ├── seed-admin.js         # Super Admin provisioning script
│   └── create-icons.ps1      # Icon PNG generation script
├── docs/                     # Comprehensive architecture and context docs
├── assets/images/            # App icons, splash, and SCE logo assets
└── src/
    ├── app/                  # Expo Router file routes
    │   ├── _layout.tsx       # Root layout wrapping Context Providers & Stack
    │   ├── index.tsx         # Splash / Route redirect dispatcher
    │   ├── login.tsx         # User authentication screen (online & offline)
    │   └── (tabs)/           # Authenticated tab navigation
    │       ├── _layout.tsx   # Tab bar definition & permission hiding
    │       ├── index.tsx     # Student Registration screen
    │       ├── records.tsx   # Participant Directory & pass viewer
    │       ├── scanner.tsx   # QR code venue check-in scanner
    │       ├── analytics.tsx # Financial & registration analytics
    │       └── admin.tsx     # Super Admin configuration & moderators
    ├── components/           # Reusable UI components
    │   ├── AppLoader.tsx     # Theme-aware animated initial loader
    │   ├── HeaderBar.tsx     # Top header with cloud sync, theme toggle & logout
    │   ├── PaymentBadge.tsx  # Color-coded badge for payment status
    │   ├── SelectDropdown.tsx# Modal picker dropdown component
    │   ├── TicketModal.tsx   # Pass preview modal with download & share
    │   └── ui/               # Modular Cross-Device UI Component Library
    │       ├── index.ts      # Barrel export
    │       ├── Card.tsx      # Elevated card with surface & highlight variants
    │       ├── Button.tsx    # Primary, secondary, outline, ghost buttons
    │       ├── Input.tsx     # Responsive text input with floating label & eye toggle
    │       ├── Badge.tsx     # Status indicator badges (success, error, warning)
    │       └── Modal.tsx     # Safe-area and notch-aware responsive modal wrapper
    ├── context/              # Global React Contexts
    │   ├── AuthContext.tsx   # User session, login, logout, role checking
    │   ├── ThemeContext.tsx  # Dark / Light theme tokens and toggle
    │   └── AlertContext.tsx  # Custom theme-aware animated dialogs & confirms
    ├── services/             # Core business & data services
    │   ├── dataStore.ts      # Unified data store managing Supabase & SQLite fallback
    │   ├── sqliteStore.ts    # SQLite offline database (6 tables) & sync engine
    │   └── ticketService.ts  # PDF pass generation, download & CSV export
    ├── theme/                # Theme and responsive utilities
    │   └── responsive.ts     # Device detection, scale, moderateScale, responsiveFontSize
    └── types/                # TypeScript interface definitions
        └── index.ts          # AppUser, Registration, Sport, Department, etc.
```

---

## 3. Global Context Providers

All contexts are wrapped hierarchically inside [`src/app/_layout.tsx`](../src/app/_layout.tsx):

```tsx
<ThemeProvider>
  <AlertProvider>
    <AuthProvider>
      <RootNav />
    </AuthProvider>
  </AlertProvider>
</ThemeProvider>
```

1. **`ThemeProvider`** ([`src/context/ThemeContext.tsx`](../src/context/ThemeContext.tsx)):
   - Supplies `isDark`, `toggleTheme`, and `colors` palette.
   - Preserves theme preferences in `AsyncStorage`.
   - Adapts to system appearance automatically while supporting manual toggles.

2. **`AlertProvider`** ([`src/context/AlertContext.tsx`](../src/context/AlertContext.tsx)):
   - Eliminates unstyled native OS dialogs.
   - Provides animated modal dialogs: `showAlert`, `showConfirm`, `showSuccess`, `showError`, `showWarning`.
   - Distinctive icon badges, soft colored backgrounds, and theme-aware buttons.

3. **`AuthProvider`** ([`src/context/AuthContext.tsx`](../src/context/AuthContext.tsx)):
   - Manages active user session (`user: AppUser | null`).
   - Exposes `login()`, `logout()`, `isSuperAdmin`, `isModerator`, and `can(action: keyof ModeratorPermissions)`.
   - Persists session in `@eventdesk_active_user_session`.
   - Supports **100% offline login** via `sqliteStore` user credentials.

---

## 4. Cross-Device Responsive Layout System

To ensure consistent typography, button heights, padding, and layout across all device form factors (small phones, large phones, foldables, and tablets), the application uses [`src/theme/responsive.ts`](../src/theme/responsive.ts):

### Core Utilities
- **`metrics`**: Exposes `screenWidth`, `screenHeight`, `isSmallPhone` (width < 375), `isPhone`, `isTablet` (width ≥ 768), and `isLandscape`.
- **`scale(size)`**: Scales linearly with screen width based on a 375pt baseline.
- **`verticalScale(size)`**: Scales linearly with screen height based on an 812pt baseline.
- **`moderateScale(size, factor = 0.5)`**: Controlled scaling with a dampening factor to avoid overly oversized components on large screens.
- **`responsiveFontSize(size)`**: Dynamically clamps font sizing using `PixelRatio.getFontScale()` and device classification, preventing text truncation or overflowing buttons.
- **`useResponsive()`**: Custom React Hook that subscribes to dimension changes for fluid orientation handling.

---

## 5. Offline-First Dual-Layer Data Architecture

```text
       ┌────────────────────────┐
       │     UI Screen Layer    │
       └───────────┬────────────┘
                   │
                   ▼
       ┌────────────────────────┐
       │   dataStore Service    │
       └─────┬────────────┬─────┘
             │            │
  (Cloud)    ▼            ▼   (Local Offline)
┌──────────────────┐  ┌──────────────────────────────────┐
│  Supabase Cloud  │  │  SQLite Database (eventdesk.db)  │
│  (PostgreSQL)    │  │  • local_batches                 │
└──────────────────┘  │  • local_departments             │
                      │  • local_sports                  │
                      │  • local_registrations           │
                      │  • local_users                   │
                      │  • local_audit_logs              │
                      └──────────────────────────────────┘
```

1. **Write Flow**: Every mutation (creating registration, check-in, adding batch, creating moderator) writes immediately to local SQLite with `synced = 0`. If internet is available, it simultaneously updates Supabase and sets `synced = 1`.
2. **Read Flow**: When online, data is downloaded from Supabase and cached in SQLite. When offline, all data is read directly from SQLite tables without network errors.
3. **Authentication Flow**: Supabase is queried first. If offline, credentials are verified against `local_users` using salted SHA-256 hashes, allowing staff to authenticate anywhere.

---

## 6. Automated Unit Testing Architecture

Automated unit tests live in [`tests/unit_tests.mjs`](../tests/unit_tests.mjs) and run with `npm test`.

- Zero external test runner dependencies (uses Node 24 native `node:test`, `node:assert`, and in-memory `node:sqlite`).
- Tests all critical business and data engine functionalities:
  - SQLite table creation and schema definitions
  - Batches, departments, and sports CRUD operations
  - Registration creation, validation, and composite roll number generation
  - QR token generation and idempotent check-in validation
  - Offline authentication and role permission checking
  - Audit logging and query ordering
  - Financial analytics engine aggregate calculations
  - CSV export formatting and escaping
  - Bidirectional cloud sync conflict protection
