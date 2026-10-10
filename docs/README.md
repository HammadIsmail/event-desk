# Society of Chemical Engineers — Event Desk Documentation Index

Welcome to the **Society of Chemical Engineers (SCE) Event Desk** project documentation. This documentation is structured to give developers and AI coding assistants comprehensive context regarding the architecture, database schema, offline sync engine, permissions, responsive design system, unit testing, and build processes.

---

## 📚 Documentation Structure

| Document | Purpose & Key Topics |
| :--- | :--- |
| [**Architecture Overview**](./ARCHITECTURE.md) | High-level system architecture, Expo Router tabs, context providers, responsive UI design system (`src/theme/responsive.ts`), component library (`src/components/ui/`), and unit testing. |
| [**Permissions & Role Access**](./PERMISSIONS_AND_ROLES.md) | Super Admin vs Moderator RBAC, granular permission flags, tab hiding logic, offline authentication, and permission persistence. |
| [**Database & Offline Sync**](./DATABASE_AND_SYNC.md) | Supabase PostgreSQL schema, local SQLite database (`eventdesk.db`), 6 local tables, offline authentication fallback, and bidirectional cloud sync workflow. |
| [**Features & Workflows**](./FEATURES_GUIDE.md) | Participant registration, QR code generation, direct PDF pass download, venue scanner, analytics, password visibility eye toggle, and custom themed dialogs. |
| [**Deployment & EAS Build**](./DEPLOYMENT_AND_BUILD.md) | APK building with Expo EAS Cloud (`eas.json`), seeding admins, configuration plugins, unit test execution (`npm test`), and troubleshooting. |

---

## 🚀 Quick Reference

- **App Name**: Society of Chemical Engineers
- **Slug**: `society-of-chemical-engineers`
- **Android Package**: `com.sce.eventdesk`
- **Framework**: Expo SDK 57 (React Native `0.86.3`, React `19.2.3`)
- **Routing**: Expo Router v5 (Typed, file-based navigation in `src/app/`)
- **Backend**: Supabase (PostgreSQL with RLS) + Local SQLite (`expo-sqlite` ~57.0.4)
- **Offline Storage**: Full 6-table offline SQLite store (`eventdesk.db`) supporting 100% offline app operation
- **Responsive UI**: Custom cross-device responsive system (`src/theme/responsive.ts`) and modular UI library (`src/components/ui/`)
- **Automated Testing**: 11 unit test suites (`tests/unit_tests.mjs`) runnable via `npm test`
- **Theme**: Automatic Dark / Light mode support with curated HSL/hex tokens

---

## 🧭 Entry Points in Codebase

- Root layout & Providers: [`src/app/_layout.tsx`](../src/app/_layout.tsx)
- Tab Layout & Navigation: [`src/app/(tabs)/_layout.tsx`](../src/app/(tabs)/_layout.tsx)
- Registration Screen: [`src/app/(tabs)/index.tsx`](../src/app/(tabs)/index.tsx)
- Directory Screen: [`src/app/(tabs)/records.tsx`](../src/app/(tabs)/records.tsx)
- QR Scanner Screen: [`src/app/(tabs)/scanner.tsx`](../src/app/(tabs)/scanner.tsx)
- Analytics Screen: [`src/app/(tabs)/analytics.tsx`](../src/app/(tabs)/analytics.tsx)
- Super Admin Screen: [`src/app/(tabs)/admin.tsx`](../src/app/(tabs)/admin.tsx)
- Unified Data Store: [`src/services/dataStore.ts`](../src/services/dataStore.ts)
- SQLite Offline Engine: [`src/services/sqliteStore.ts`](../src/services/sqliteStore.ts)
- Ticket Pass & PDF Engine: [`src/services/ticketService.ts`](../src/services/ticketService.ts)
- Responsive Design Engine: [`src/theme/responsive.ts`](../src/theme/responsive.ts)
- Component UI Library: [`src/components/ui/index.ts`](../src/components/ui/index.ts)
- Automated Unit Tests: [`tests/unit_tests.mjs`](../tests/unit_tests.mjs)
