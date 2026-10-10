# Deployment & EAS Cloud Build Guide

This document outlines how to verify code quality, build standalone Android APK files with EAS Cloud, manage environment variables, and seed the initial Super Admin account.

---

## 1. Pre-Build Verification Checklist

Always run the full verification pipeline before triggering cloud builds or publishing releases:

```bash
# 1. Run automated unit test suite (11 functional tests)
npm test

# 2. Run TypeScript static typechecker
npx tsc --noEmit

# 3. Run Expo linter
npx expo lint

# 4. Optional: Check dependency health
npx expo-doctor
```

Ensure all commands report 0 errors before proceeding with EAS builds.

---

## 2. EAS Cloud Build (Standalone APK)

The project includes [`eas.json`](../eas.json) preconfigured to produce downloadable, standalone `.apk` files without needing Android Studio or a local build environment.

### Command:
```bash
npx eas-cli@latest build -p android --profile preview
```

### Build Workflow:
1. When prompted, log in with your free [Expo account](https://expo.dev).
2. If asked to generate a new Android keystore, select **Yes** (EAS manages and secures signing credentials in the cloud).
3. The build queue will start in Expo Cloud.
4. When finished, a direct URL and QR code will appear in your console to download and install the APK on any Android device.

---

## 3. Environment Variables

Store your credentials in `.env` (use `.env.example` as a template):

```env
EXPO_PUBLIC_SUPABASE_URL=https://<your-project-id>.supabase.co
EXPO_PUBLIC_SUPABASE_KEY=<your-anon-publishable-key>
```

> **Note**: Variables prefixed with `EXPO_PUBLIC_` are bundled client-side for public REST requests to Supabase with Row Level Security.

---

## 4. Initial Super Admin Seeding

To create or reset the Super Admin account in Supabase:

```bash
node scripts/seed-admin.js <username> <password> "<Full Name>"
```

### Example:
```bash
node scripts/seed-admin.js admin Admin123! "Super Administrator"
```

> **Offline Fallback**: The app also automatically provisions the default Super Admin credentials (`admin` / `Admin123!`) in local SQLite (`eventdesk.db`) on initial launch, ensuring administrators can log in even before the first cloud connection.

---

## 5. Icon Generation & Branding Assets

If the society logo is updated in the future:
1. Place the new source image at `assets/images/sce-logo.png`.
2. Run the icon generation script:
   ```powershell
   powershell -ExecutionPolicy Bypass -File scripts/create-icons.ps1
   ```
   This automatically creates 1024x1024 PNG icons with Android safe-zone padding for `icon.png`, `android-icon-foreground.png`, and `splash-icon.png`.
