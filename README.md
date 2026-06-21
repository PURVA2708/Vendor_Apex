# ProcureFlow — Smart Procurement SaaS

ProcureFlow is an end-to-end procurement management system built as a Hackathon Blueprint. It covers the full lifecycle from Purchase Requisitions (RFQs), Vendor Bidding, Purchase Order (PO) Generation, Goods Receipt Notes (GRN), to Invoice Settlements.

## Features

- **Admin/Internal Dashboard:** Manage RFQs, compare vendor quotations, issue Purchase Orders, and approve invoices.
- **Vendor Portal:** A separate secure portal for vendors to view invited RFQs, submit quotes, view awarded POs, and upload invoices.
- **Automated Workflows:** Automatic PO generation upon awarding an RFQ, state-machine validated status transitions.
- **Analytics:** Dashboard with monthly PO value trends, RFQs by category, and vendor performance metrics.
- **PDF Generation:** Instantly download Purchase Orders as perfectly formatted PDFs.
- **Email Notifications:** Asynchronous background email queue notifying vendors of new RFQs and POs.

## Tech Stack

- **Frontend:** React 18, Vite, TypeScript, TailwindCSS, Zustand, TanStack Query, Recharts.
- **Backend:** Node.js 20, Express, TypeScript, Prisma ORM, BullMQ (Queue), Puppeteer (PDF), Nodemailer.
- **Database:** PostgreSQL (Primary), Redis (Queue), MinIO (S3 Object Storage).
- **Architecture:** Turborepo Monorepo.

## Local Setup Instructions

### Prerequisites
- Node.js >= 20
- pnpm >= 9.0

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Environment Variables
Copy `.env.example` to `.env` in both `apps/api` and `apps/web`. 
The default configuration uses a local **SQLite** database, meaning no extra installation is required!

### 3. Database Setup (SQLite)
Run the following commands to initialize the local SQLite database and populate it with demo data:
```cmd
# 1. Switch to the correct drive if needed (e.g., e:)
e:

# 2. Navigate to the API folder
cd "e:\ODOO KSV\Vendor_Apex\apps\api"

# 3. Create the database tables
npx prisma db push

# 4. Seed with demo data
npx prisma db seed
```

### 5. Run the Application
Start both the frontend and backend development servers:
```bash
# from the root directory
pnpm run dev
```

### 6. Access the Application
- **Main App:** http://localhost:3000
- **API Server:** http://localhost:4000
- **MailHog (Emails):** http://localhost:8025
- **MinIO (Storage):** http://localhost:9001

### Demo Credentials
**Internal Users (Admin Dashboard):**
- `admin@procureflow.com` (Password: `password123`)
- `manager@procureflow.com` (Password: `password123`)

**Vendors (Vendor Portal):**
- `vendor1@techsupplies.com` (Password: `vendor123`)
- `vendor2@globalparts.com` (Password: `vendor123`)
