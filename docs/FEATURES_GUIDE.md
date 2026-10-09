# Features & Application Workflows

This document outlines key feature implementations in the Society of Chemical Engineers Event Desk.

---

## 1. Student Registration Flow

- **File**: [`src/app/(tabs)/index.tsx`](../src/app/(tabs)/index.tsx)
- **Automatic Code Generation**:
  - Automatically builds composite registration IDs: `${sessionYear}-${selectedDeptCode}-${rollNumber}` (e.g. `2024-CH-058`).
  - Auto-capitalizes all input strings (`UPPERCASE`).
- **Partner Fields**: Dynamically appears when a team or doubles category (e.g. `2v2`, `Doubles`, `Team`) is selected.
- **Duplicate Prevention**: Queries local database & cloud before submission to prevent duplicate participant entries.
- **Immediate Pass Issuance**: On successful registration, automatically pops up the [`TicketModal`](../src/components/TicketModal.tsx) to download or share the generated pass immediately.

---

## 2. Pass & Ticket Generation Engine

- **File**: [`src/services/ticketService.ts`](../src/services/ticketService.ts)
- **HTML/CSS Design**:
  - High-resolution card with dark header branded for **Society of Chemical Engineers**.
  - QR Code embedded via `qrserver.com` with unique token.
  - Color-coded payment pill (`PAID`, `PARTIAL`, `FREE`, `UNPAID`).
- **Direct PDF Download**:
  - Uses `Print.printToFileAsync({ html, base64: true })`.
  - Directly writes base64 PDF into phone document storage via `FileSystem.writeAsStringAsync` to eliminate Android `IOException` / file-copy failures.
- **System Share**:
  - Uses `Sharing.shareAsync` to share pass directly to WhatsApp, email, or Bluetooth.
- **CSV Export**:
  - Generates standard CSV spreadsheets filtered by event/sport or total participants.

---

## 3. QR Venue Scanner & Check-In

- **File**: [`src/app/(tabs)/scanner.tsx`](../src/app/(tabs)/scanner.tsx)
- **Camera Integration**: Uses `expo-camera` (`CameraView`) with instant barcode scanning.
- **Manual Token Entry**: Supports manual code input if the camera lens is dirty or damaged.
- **Check-In Verification**:
  - Instant validation of QR token.
  - Alerts if a pass has already been checked in (showing original check-in timestamp and volunteer username).
  - One-tap "Confirm Check-In" action.

---

## 4. Financial & Event Analytics

- **File**: [`src/app/(tabs)/analytics.tsx`](../src/app/(tabs)/analytics.tsx)
- **Metrics Calculated**:
  - Total participants registered.
  - Total revenue collected vs pending balance.
  - Check-in attendance rate (percentage and count).
  - Breakdown per sport (revenue, registrations, check-in count).

---

## 5. Theme-Aware Alert & Confirmation Dialogs

- **File**: [`src/context/AlertContext.tsx`](../src/context/AlertContext.tsx)
- Replaces native OS alert boxes.
- Smooth pop-in spring animation.
- Supports light & dark modes with custom color accents for success, error, warning, and confirmation dialogs.
- Dual-button confirmation with loading indicators for destructive operations.
