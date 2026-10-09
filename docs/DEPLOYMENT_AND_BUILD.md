# Deployment & EAS Cloud Build Guide

This document outlines how to build standalone Android APK files, manage environment variables, and seed the initial Super Admin account.

---

## 1. EAS Cloud Build (Standalone APK)

The project includes [`eas.json`](../eas.json) preconfigured to produce downloadable, standalone `.apk` files without needing Android Studio or a local build environment.

### Command:
```bash
npx eas-cli@latest build -p android --profile preview
```

### Build Process:
1. When prompted, log in with your free [Expo account](https://expo.dev).
2. If asked to generate a new Android keystore, select **Yes** (EAS manages and secures signing credentials in the cloud).
3. The build queue will start in Expo Cloud.
4. When finished, a direct URL and QR code will appear in your console to download and install the APK on any Android device.

---

## 2. Environment Variables

Store your credentials in `.env` (use `.env.example` as a template):

```env
EXPO_PUBLIC_SUPABASE_URL=https://<your-project-id>.supabase.co
EXPO_PUBLIC_SUPABASE_KEY=<your-anon-publishable-key>
```

> **Note**: Variables prefixed with `EXPO_PUBLIC_` are bundled client-side for public REST requests to Supabase with Row Level Security.

---

## 3. Initial Super Admin Seeding

To create or reset the Super Admin account in Supabase:

```bash
node scripts/seed-admin.js <username> <password> "<Full Name>"
```

### Example:
```bash
node scripts/seed-admin.js admin Admin123! "Super Administrator"
```

---

## 4. Icon Generation & Branding Assets

If the society logo is updated in the future:
1. Place the new source image at `assets/images/sce-logo.png`.
2. Run the icon generation script:
   ```powershell
   powershell -ExecutionPolicy Bypass -File scripts/create-icons.ps1
   ```
   This automatically creates 1024x1024 PNG icons with Android safe-zone padding for `icon.png`, `android-icon-foreground.png`, and `splash-icon.png`.
