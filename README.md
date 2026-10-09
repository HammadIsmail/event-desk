# Society of Chemical Engineers — Event Desk

> Official Mobile Event Desk for the Society of Chemical Engineers (SCE). Built with Expo SDK 57, React Native, Supabase (PostgreSQL), and offline-first SQLite.

---

## 📱 Features

- **Participant Registration**: Issue customized QR passes with automated roll number generation (`YYYY-DEPT-ROLL`) and partner support for team sports.
- **Direct PDF Pass Downloads & Sharing**: High-resolution print passes generated via `expo-print` with one-tap device saving and social sharing.
- **Venue QR Scanner**: Instant check-in verification using `expo-camera` with duplicate check-in prevention.
- **Role-Based Access Control**: Granular permissions system for Moderators (`can_register`, `can_view_records`, `can_scan`, `can_view_analytics`, `can_export_csv`).
- **Offline-First SQLite**: Local database persistence ensuring full offline functionality with bidirectional cloud synchronization.
- **Financial Analytics**: Real-time revenue tracking, attendance metrics, and sport-by-sport breakdown with CSV export.
- **Theme-Aware Dialogs**: Custom animated alert and confirmation modals following dark and light mode tokens.

---

## 📖 Context & Architecture Documentation

For complete technical documentation and AI assistant context, refer to the [`docs/`](./docs/) directory:

- [**System Architecture**](./docs/ARCHITECTURE.md)
- [**Permissions & Role Access Control**](./docs/PERMISSIONS_AND_ROLES.md)
- [**Database Schema & Offline Sync**](./docs/DATABASE_AND_SYNC.md)
- [**Feature Implementation Guide**](./docs/FEATURES_GUIDE.md)
- [**Deployment & EAS Cloud Build Guide**](./docs/DEPLOYMENT_AND_BUILD.md)

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Copy `.env.example` to `.env` and fill in your Supabase credentials:
```bash
cp .env.example .env
```

### 3. Start Development Server
```bash
npx expo start
```

### 4. Seed Super Admin
```bash
node scripts/seed-admin.js admin Admin123! "Super Administrator"
```

### 5. Build Standalone APK
```bash
npx eas-cli@latest build -p android --profile preview
```

---

## 👨‍💻 Developer & Credits

- **Society**: Society of Chemical Engineers (SCE)
- **Engineered & Developed by**: Hammad
- **Contact**: [hammadismail807@gmail.com](mailto:hammadismail807@gmail.com)
