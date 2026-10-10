# Features & Application Workflows

This document outlines key feature implementations, user workflows, and operational capabilities in the **Society of Chemical Engineers Event Desk**.

---

## 1. Student Registration Flow

- **File**: [`src/app/(tabs)/index.tsx`](../src/app/(tabs)/index.tsx)
- **Automatic Composite ID**:
  - Automatically builds composite registration IDs: `${sessionYear}-${selectedDeptCode}-${rollNumber}` (e.g. `2024-CH-058`).
  - Auto-capitalizes all text inputs.
- **Dynamic Partner Fields**: Partner fields appear dynamically when team or doubles categories (e.g. `2v2`, `Doubles`, `Team`) are selected.
- **Duplicate Prevention**: Queries local SQLite database and cloud before submission to ensure no student registers twice for the same event.
- **Immediate Pass Issuance**: On successful registration, automatically presents the [`TicketModal`](../src/components/TicketModal.tsx) to download or share the generated pass immediately.
- **Offline Registration**: Saves directly to `local_registrations` with `synced = 0` when offline, allowing registration booths to operate without internet connectivity.

---

## 2. Pass & Ticket Generation Engine

- **File**: [`src/services/ticketService.ts`](../src/services/ticketService.ts)
- **HTML/CSS Design**:
  - High-resolution digital ticket branded for **Society of Chemical Engineers**.
  - QR Code embedded with unique verified token (`EVT-<REG_NO>-<SPORT>-<TIMESTAMP>-<RANDOM>`).
  - Color-coded payment pill (`PAID`, `PARTIAL`, `FREE`, `UNPAID`).
- **Direct PDF Download**:
  - Uses `Print.printToFileAsync({ html, base64: true })`.
  - Directly writes base64 PDF into phone document storage via `FileSystem.writeAsStringAsync` to eliminate Android `IOException` / file-copy failures.
- **System Share**:
  - Uses `Sharing.shareAsync` to share passes directly to WhatsApp, email, or Bluetooth.
- **CSV Export**:
  - Generates standard CSV spreadsheets filtered by event/sport or total participants.

---

## 3. QR Venue Scanner & Check-In

- **File**: [`src/app/(tabs)/scanner.tsx`](../src/app/(tabs)/scanner.tsx)
- **Camera Integration**: Uses `expo-camera` (`CameraView`) with instant barcode scanning.
- **Manual Token Entry**: Supports manual code input if the camera lens is dirty, in poor lighting, or damaged.
- **Check-In Verification**:
  - Instant validation of QR token against local SQLite database.
  - Detects duplicate scans: alerts staff if a pass has already been checked in (displaying the original check-in timestamp and staff username).
  - One-tap "Confirm Check-In" action.
  - Operates **100% offline** without needing an internet connection.

---

## 4. Financial & Event Analytics

- **File**: [`src/app/(tabs)/analytics.tsx`](../src/app/(tabs)/analytics.tsx)
- **Metrics Calculated**:
  - Total participants registered.
  - Total revenue expected (sum of fees).
  - Total revenue collected (sum of paid amounts).
  - Pending balance due (`expected - collected`).
  - Payment breakdown: counts of Paid, Partial, Free Pass, and Unpaid participants.
  - Per-sport registration count and revenue breakdown.
  - Per-department student enrollment breakdown.
  - Filtered CSV download directly from the analytics dashboard.

---

## 5. Super Admin & Moderator Management

- **File**: [`src/app/(tabs)/admin.tsx`](../src/app/(tabs)/admin.tsx)
- **Moderator Account Provisioning**: Super Admins can add volunteer/moderator accounts with full name, username, and password.
- **Password Visibility Eye Toggle**:
  - Password inputs feature an interactive eye icon (`Ionicons eye / eye-off`) allowing users and administrators to toggle password visibility before submitting.
- **Granular Permissions Configuration**:
  - Checkboxes to toggle `can_register`, `can_view_records`, `can_scan`, `can_view_analytics`, and `can_export_csv`.
- **Status Toggling**: One-tap toggle to activate or deactivate moderator accounts.
- **Event Catalog CRUD**:
  - Add / delete academic batch years.
  - Add / edit / delete academic departments.
  - Add / edit / delete sports, fee pricing, and format options.

---

## 6. Cross-Device Responsive Layout System

- **File**: [`src/theme/responsive.ts`](../src/theme/responsive.ts) & [`src/components/ui/`](../src/components/ui/)
- Ensures seamless visual rendering across small phones, standard phones, large flagships, and tablets:
  - Font sizes dynamically scaled via `responsiveFontSize()`.
  - Component dimensions and spacing scaled via `moderateScale()`.
  - Modular UI library (`Card`, `Button`, `Input`, `Badge`, `Modal`) guarantees consistent design tokens.
  - Safe-area notch and Android navigation-bar padding to prevent UI clipping.

---

## 7. Theme-Aware Alert & Confirmation Dialogs

- **File**: [`src/context/AlertContext.tsx`](../src/context/AlertContext.tsx)
- Replaces native OS alert dialogs with sleek in-app modals.
- Smooth spring pop-in animation.
- Palette-matched alert variants: Success, Error, Warning, Info, and Confirm.
- Two-button confirmation modals for destructive operations (deleting records, removing sports, signing out).
