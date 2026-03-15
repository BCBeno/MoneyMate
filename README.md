<div align="center">

<br/>

```
 __  __                        __  __       _       
|  \/  | ___  _ __   ___ _   _|  \/  | __ _| |_ ___ 
| |\/| |/ _ \| '_ \ / _ \ | | | |\/| |/ _` | __/ _ \
| |  | | (_) | | | |  __/ |_| | |  | | (_| | ||  __/
|_|  |_|\___/|_| |_|\___|\__, |_|  |_|\__,_|\__\___|
                          |___/                      
```

**Personal finance tracker · Dark mode · SQLite · Multi-currency**
> 📱 [**View full README →**](https://bcbeno.github.io/MoneyMate)

[![React Native](https://img.shields.io/badge/React_Native-0.81-61DAFB?style=flat-square&logo=react)](https://reactnative.dev)
[![Expo SDK](https://img.shields.io/badge/Expo_SDK-54-000020?style=flat-square&logo=expo)](https://expo.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?style=flat-square&logo=typescript)](https://typescriptlang.org)
[![SQLite](https://img.shields.io/badge/SQLite-local--first-003B57?style=flat-square&logo=sqlite)](https://sqlite.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-00D4AA?style=flat-square)](LICENSE)

</div>

---

## 📱 Screenshots

<div align="center">

| Home | Add Transaction | Reports | Settings |
|------|----------------|---------|----------|
| Monthly balance card, income/expenses breakdown, searchable transaction list | Manual amount input, category picker, date picker, currency selector | Bar chart, donut chart by category, drill-down into any category | PIN lock, biometrics, JSON/CSV/SQLite export, custom categories |

</div>

---

## ✨ Features

- **📊 Visual reports** — Bar and donut charts showing income vs expenses. Tap any category to see its transactions. Switch between 1 month, 3 months, or 1 year views.
- **💸 Transactions** — Add income & expenses with a category picker, date picker, and multi-currency support. Edit or delete any transaction with a single tap. Grouped by date, newest first.
- **💱 Multi-currency** — Track transactions in RON, EUR, USD, GBP, and more. All amounts stored with a base-currency equivalent for unified reporting.
- **🗄️ Import & Export** — Export your data as JSON, CSV, or raw SQLite. Import from JSON backups or `.db`/`.sqlite` files. Compatible with MoneyMate backup files (`.mmbak`).
- **🏷️ Custom categories** — 11 built-in categories for income and expenses. Create unlimited custom categories with any emoji icon and color.
- **🔐 PIN & Biometrics** — Protect your data with a 4-digit PIN or Face ID / fingerprint authentication.
- **🌙 Dark-first design** — Pure dark theme (`#0B0D12` base, `#00D4AA` teal accent). Red border on balance card when spending exceeds income.

---

## 🏗️ Tech stack

| Layer | Technology |
|-------|-----------|
| Framework | React Native 0.81 + Expo SDK 54 |
| Language | TypeScript (strict) |
| Database | expo-sqlite v16 (local-first, no cloud required) |
| State | Zustand v5 |
| Charts | react-native-svg (custom SVG, no chart libraries) |
| Navigation | React Navigation v7 (bottom tabs + stack) |
| File I/O | expo-file-system/legacy, expo-document-picker, expo-sharing |
| Auth | expo-local-authentication, expo-secure-store |

---

## 🗄️ Database schema

```sql
-- Core tables
transactions  (id, type, amount, currency_code, amount_ron, category_id, date, description, note)
categories    (id, name, icon, color, type, is_default)
currencies    (code, name, symbol, rate_to_ron, last_updated)
settings      (key, value, updated_at)

-- Indexes
idx_transactions_date      ON transactions(date)
idx_transactions_category  ON transactions(category_id)
idx_transactions_type      ON transactions(type)
```

All data lives **on-device**. No accounts, no cloud, no subscriptions.

---

## 🚀 Getting started

### Prerequisites

- Node.js 18+
- [Expo Go](https://expo.dev/go) app on your Android or iOS device (for development)

### Install

```bash
git clone https://github.com/your-username/MoneyMate.git
cd MoneyMate
npm install
```

### Run

```bash
# Start Expo dev server
npx expo start

# Open on Android emulator
npx expo start --android

# Open on iOS simulator (macOS only)
npx expo start --ios
```

Scan the QR code with Expo Go to open the app on your device.

---

## 📦 Build for production

Uses [EAS Build](https://docs.expo.dev/build/introduction/) from Expo.

```bash
# Install EAS CLI
npm install -g eas-cli
eas login

# Preview APK (for testing)
eas build --platform android --profile preview

# Production App Bundle (for Google Play)
eas build --platform android --profile production
```

`eas.json` is pre-configured with `preview` (APK) and `production` (AAB) profiles.

---

## 📂 Project structure

```
MoneyMate/
├── src/
│   ├── screens/
│   │   ├── home/           # Unified home + transactions screen
│   │   ├── reports/        # Charts + category drill-down
│   │   ├── settings/       # Settings, categories, PIN
│   │   └── auth/           # PIN setup + lock screen
│   ├── components/
│   │   └── common/         # DatePickerModal, MonthPickerModal, BottomSheetPicker
│   ├── database/
│   │   ├── repositories/   # transactionRepository, categoryRepository, ...
│   │   ├── migrations.ts   # Schema versioning (auto-reset on upgrade)
│   │   └── seeds.ts        # Default categories + currencies
│   ├── services/
│   │   ├── exportService.ts   # JSON / CSV / SQLite export
│   │   ├── importService.ts   # JSON / SQLite import
│   │   └── securityService.ts # PIN + biometrics
│   ├── store/              # Zustand slices (transactions, settings)
│   ├── theme/              # colors.ts, typography.ts, spacing.ts
│   └── utils/              # formatCurrency, formatDate, calculations
```

---

## 📥 Importing data

### From a MoneyMate `.mmbak` backup

The repo includes a migration script that converts an existing MoneyMate `.mmbak` file into a JSON file that can be imported directly into the app.

```bash
# Run the migration script (Python 3)
python3 scripts/migrate_mmbak.py path/to/backup.mmbak moneymate_migrated.json
```

Then in the app: **Settings → Import Data → Import JSON** and select the generated file.

### From any SQLite file

**Settings → Import Data → Import SQLite** — the app will attempt to map transactions and categories from the source schema automatically.

---

## 🎨 Design tokens

```typescript
// src/theme/colors.ts
bg:      { primary: '#0B0D12', secondary: '#13161E', tertiary: '#1A1E2A', elevated: '#222840' }
accent:  { primary: '#00D4AA', secondary: '#00A882' }
income:  '#34D399'   // green
expense: '#F87171'   // red
```

---

## 📄 License

MIT — see [LICENSE](LICENSE) for details.

---

<div align="center">
  <sub>Built with React Native + Expo · Local-first · No tracking · No ads</sub>
</div>
