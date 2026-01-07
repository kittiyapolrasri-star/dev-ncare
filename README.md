# 🏥 PharmaCare ERP

ระบบบริหารจัดการร้านยาและคลังยาแบบครบวงจร

## Features

- ✅ Multi-branch Management (หลายสาขา)
- ✅ VAT / Non-VAT Inventory (คลัง VAT และ Non-VAT แยกชัดเจน)
- ✅ OEM Product Integration (รับสินค้าจาก OEM)
- ✅ POS System (ระบบขายหน้าร้าน)
- ✅ Distributor Management (ระบบตัวแทนจำหน่าย)
- ✅ Financial Reports (รายงานการเงิน)
- ✅ AI Integration Ready (พร้อมเชื่อมต่อ AI)

## Tech Stack

- **Frontend**: Next.js 14 + TypeScript + Tailwind CSS
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL + Prisma ORM
- **Cache**: Redis
- **UI Components**: Shadcn/UI

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL 15+
- Redis (optional, for caching)

### Installation

```bash
# Install dependencies
npm install

# Setup database
npm run db:push
npm run db:seed

# Start development
npm run dev
```

### Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

## Project Structure

```
pharma-erp/
├── apps/
│   ├── web/           # Next.js Frontend
│   └── api/           # Node.js Backend
├── packages/
│   ├── types/         # Shared TypeScript Types
│   ├── utils/         # Shared Utilities
│   └── ui/            # Shared UI Components
└── docs/              # Documentation
```

## License

Private - All Rights Reserved
