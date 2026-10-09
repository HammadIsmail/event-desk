# Society of Chemical Engineers — Event Desk Documentation Index

Welcome to the **Society of Chemical Engineers (SCE) Event Desk** project documentation. This documentation is structured to give developers and AI coding assistants (such as Antigravity) comprehensive context regarding the architecture, database schema, offline sync engine, permissions, and build processes.

---

## 📚 Documentation Structure

| Document | Purpose & Key Topics |
| :--- | :--- |
| [**Architecture Overview**](./ARCHITECTURE.md) | High-level system architecture, Expo Router tabs, context providers, component hierarchy, design tokens. |
| [**Permissions & Role Access**](./PERMISSIONS_AND_ROLES.md) | Super Admin vs Moderator RBAC, granular permission flags, tab hiding logic, and permission persistence. |
| [**Database & Offline Sync**](./DATABASE_AND_SYNC.md) | Supabase schema (`app_users`, `registrations`, etc.), local SQLite schema, and bidirectional cloud sync workflow. |
| [**Features & Workflows**](./FEATURES_GUIDE.md) | Participant registration, QR code generation, direct PDF pass download, venue scanner, analytics, and custom themed dialogs. |
| [**Deployment & EAS Build**](./DEPLOYMENT_AND_BUILD.md) | APK building with Expo EAS Cloud (`eas.json`), seeding admins, configuration plugins, and troubleshooting. |

---

## 🚀 Quick Reference

- **App Name**: Society of Chemical Engineers
- **Slug**: `society-of-chemical-engineers`
- **Android Package**: `com.sce.eventdesk`
- **Framework**: Expo SDK 57 (React Native 0.86, React 19)
- **Routing**: Expo Router v5 (File-based navigation in `src/app/`)
- **Backend**: Supabase (PostgreSQL) + Local SQLite (`expo-sqlite`)
- **Theme**: Automatic Dark / Light mode support with curated tokens

---

## 🧭 Entry Points in Codebase

- Root layout & Providers: [`src/app/_layout.tsx`](../src/app/_layout.tsx)
- Tab Layout & Navigation: [`src/app/(tabs)/_layout.tsx`](../src/app/(tabs)/_layout.tsx)
- Registration Screen: [`src/app/(tabs)/index.tsx`](../src/app/(tabs)/index.tsx)
- Directory Screen: [`src/app/(tabs)/records.tsx`](../src/app/(tabs)/records.tsx)
- QR Scanner Screen: [`src/app/(tabs)/scanner.tsx`](../src/app/(tabs)/scanner.tsx)
- Analytics Screen: [`src/app/(tabs)/analytics.tsx`](../src/app/(tabs)/analytics.tsx)
- Super Admin Screen: [`src/app/(tabs)/admin.tsx`](../src/app/(tabs)/admin.tsx)
- Data Store: [`src/services/dataStore.ts`](../src/services/dataStore.ts)
- SQLite Engine: [`src/services/sqliteStore.ts`](../src/services/sqliteStore.ts)
- Ticket Pass & PDF Engine: [`src/services/ticketService.ts`](../src/services/ticketService.ts)
