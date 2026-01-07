# 🚀 Changelog: PharmaCare ERP

## [1.0.0-RC] - 2026-01-07

### ✨ Features Added
- **POS Scan-to-Add**: Press Enter after scanning barcode to add directly to cart
- **Dynamic QR Payment**: PromptPay QR with embedded amount (EMVCo standard)
- **Inventory FEFO Splitting**: Automatic multi-batch deduction (oldest first)
- **LINE Notify Scheduler**: Daily low stock alerts (09:00) and sales summary (18:00)

### 🔧 Backend Changes
- `apps/api/src/routes/sales.ts` - Rewritten batch allocation logic
- `apps/api/src/utils/crc16.ts` - CRC16-CCITT for PromptPay
- `apps/api/src/utils/promptpay.ts` - PromptPay payload generator
- `apps/api/src/routes/payments.ts` - QR generation endpoint
- `apps/api/src/services/scheduler.ts` - Cron jobs for notifications

### 🎨 Frontend Changes
- `apps/web/src/app/dashboard/pos/page.tsx` - Added onKeyDown handler + QR display

### 📝 Documentation
- Added `docs/SYSTEM_READINESS.md`
- Added `docs/ENTERPRISE_GAP_ANALYSIS.md`
- Added `docs/FEATURE_CHECKLIST.md`

---

## [0.9.0] - 2026-01-06
### Added
- AI Intelligence Dashboard
- Sales Forecasting
- Reports Module (Sales, Inventory, Tax)

---

## [0.8.0] - Previous
- Initial POS System
- Inventory VAT/Non-VAT separation
- Multi-branch support
