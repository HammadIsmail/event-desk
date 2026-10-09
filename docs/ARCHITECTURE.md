# System Architecture Overview

This document describes the software architecture, state flow, and core design principles for the **Society of Chemical Engineers (SCE) Event Desk** application.

---

## 1. Technology Stack

- **Framework**: [Expo SDK 57](https://expo.dev) with React Native `0.86.3` and React `19.2.3`.
- **Navigation**: [Expo Router v5](https://docs.expo.dev/router/introduction/) (typed routes enabled, file-based routing in `src/app/`).
- **Data Layers**:
  - **Remote**: [Supabase](https://supabase.com) (PostgreSQL with Row Level Security, REST API via `@supabase/supabase-js`).
  - **Local/Offline**: [expo-sqlite](https://docs.expo.dev/versions/latest/sdk/sqlite/) (`offline_eventdesk.db`) with automatic table creation and delta synchronization.
  - **Client Storage**: `@react-native-async-storage/async-storage` for sessions, active tokens, and permission overrides.
- **Hardware Integration**:
  - Camera QR Scanning: `expo-camera` (`CameraView`).
  - File System & Sharing: `expo-file-system/legacy`, `expo-sharing`, `expo-print`.
- **Typography & Icons**: `@expo/vector-icons/Ionicons`.

---

## 2. Directory Structure

```text
Event-Desk/
├── app.json                  # Expo application configuration & plugins
├── eas.json                  # EAS Build configuration for APK / AAB
├── supabase-schema.sql       # Full PostgreSQL database schema & initial seeds
├── scripts/
│   ├── seed-admin.js         # Super Admin provisioning script
│   └── create-icons.ps1      # Icon PNG generation script
├── docs/                     # Comprehensive architecture and context docs
├── assets/images/            # App icons, splash, and SCE logo assets
└── src/
    ├── app/                  # Expo Router file routes
    │   ├── _layout.tsx       # Root layout wrapping Context Providers & Stack
    │   ├── index.tsx         # Splash / Route redirect dispatcher
    │   ├── login.tsx         # User authentication screen
    │   └── (tabs)/           # Authenticated tab navigation
    │       ├── _layout.tsx   # Tab bar definition & permission hiding
    │       ├── index.tsx     # Student Registration screen
    │       ├── records.tsx   # Participant Directory & pass viewer
    │       ├── scanner.tsx   # QR code venue check-in scanner
    │       ├── analytics.tsx # Financial & registration analytics
    │       └── admin.tsx     # Super Admin configuration & moderators
    ├── components/           # Reusable UI components
    │   ├── AppLoader.tsx     # Theme-aware animated initial loader
    │   ├── HeaderBar.tsx     # Top header with sync, theme toggle & logout
    │   ├── PaymentBadge.tsx  # Color-coded badge for payment status
    │   ├── SelectDropdown.tsx# Modal picker dropdown component
    │   └── TicketModal.tsx   # Pass preview modal with download & share
    ├── context/              # Global React Contexts
    │   ├── AuthContext.tsx   # User session, login, logout, role checking
    │   ├── ThemeContext.tsx  # Dark / Light theme tokens and toggle
    │   └── AlertContext.tsx  # Custom theme-aware animated dialogs & confirms
    ├── services/             # Core business & data services
    │   ├── dataStore.ts      # Unified data store managing Supabase & fallbacks
    │   ├── sqliteStore.ts    # SQLite offline database & cloud sync engine
    │   └── ticketService.ts  # PDF pass generation, download & CSV export
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

---

## 4. UI Design System & Theming

The application follows a modern dark/light system palette:

- **Primary Accent**: `#0284c7` (Sky 600) / `#38bdf8` (Sky 400).
- **Dark Mode Background**: `#0f172a` (Slate 900) with surface `#1e293b`.
- **Light Mode Background**: `#f8fafc` (Slate 50) with surface `#ffffff`.
- **Status Colors**:
  - Paid / Success: Emerald (`#059669` / `#10b981`)
  - Partial / Warning: Amber (`#d97706` / `#f59e0b`)
  - Free / Waived: Violet (`#7c3aed` / `#8b5cf6`)
  - Unpaid / Error / Destructive: Red (`#dc2626` / `#ef4444`)
