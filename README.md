# VendorBridge — Procurement & Vendor Management ERP

VendorBridge is an end-to-end Procurement and Vendor Management system built as a robust, modern ERP blueprint. It manages the full purchasing lifecycle: **Purchase Requisitions (RFQs)**, **Vendor Quotations**, **Side-by-Side Comparisons**, **Manager Approvals**, **Purchase Orders (PO) Generation**, **Invoice Settlements**, and **Audit Logs**.

This project uses a monorepo structure with a Node.js Express backend and a premium vanilla HTML5/CSS3/JS Single Page Application frontend.

---

## ⚡ Tech Stack & Architecture

- **Architecture:** Monorepo managed with **Turborepo** and **pnpm Workspaces**.
- **Frontend (`apps/web`):** Responsive Single Page Application (SPA) designed with a clean aesthetic (Harmonious Dark Theme, CSS Glassmorphism, Micro-animations, Custom Charts) using Vanilla HTML, CSS, and JS, bundled and optimized by **Vite**.
- **Backend (`apps/api`):** REST API built with **Node.js**, **Express**, and **pg** (node-postgres).
- **Database:** **PostgreSQL** (Supabase Cloud or Local Instance) secured with **Row-Level Security (RLS)**.
- **Auth:** Custom JSON Web Token (JWT) session authorization with role-based routing.
- **Emails:** Transactional email flows (Welcome, OTP, Password Reset, Purchase Orders) powered by **Nodemailer** with automatic **Ethereal Mail** dev accounts.

---

## 🚀 Quick Start & Local Setup

Follow these steps to run the project locally on your machine.

### Prerequisites
- **Node.js** >= 20.0.0
- **pnpm** >= 9.0.0 (Recommended workspace manager) or **npm**

---

### 1. Install Dependencies
From the root directory of the project, run:
```bash
pnpm install
```
*(If you do not have pnpm installed, run `npm install -g pnpm` first, or use `npm install`.)*

---

### 2. Configure Environment Variables
1. Navigate to the backend directory:
   ```bash
   cd apps/api
   ```
2. Copy `.env.example` to create your local `.env` file:
   ```bash
   cp .env.example .env
   ```
3. Open `.env` and configure your **PostgreSQL Database URL** (e.g. your Supabase connection string or local Postgres credentials).
   
   *Example:*
   ```env
   DATABASE_URL=postgresql://postgres:your_password@localhost:5432/vendor_bridge
   PORT=3000
   JWT_SECRET=your-random-jwt-secret-key-32-chars
   ```

---

### 3. Initialize & Seed the Database
Ensure your PostgreSQL database is running, then populate it with the schema and mock transaction data by running the seed script from the root:

```bash
# From the root directory:
pnpm --filter api run seed
```

*(This drops existing tables, creates the schemas for Accounts, Vendors, RFQs, Quotes, Invoices, Approvals, and Audit Logs, and inserts pre-configured demo users and activities.)*

---

### 4. Start the Application
To launch both the Vite frontend server and Express API server simultaneously, run the dev task from the root directory:

```bash
pnpm run dev
```

*Note for Windows/PowerShell users:* You can also launch the application using our startup script, which automatically detects and terminates any stale processes occupying ports `3000` or `5173`:
```powershell
.\dev.ps1
```

---

### 5. Access the Platform

Once the servers start:
- **Frontend App:** [http://localhost:5173](http://localhost:5173) (Vite server)
- **API Server:** [http://localhost:3000](http://localhost:3000)

---

## 👥 Demo User Accounts

You can log in to the dashboard using these pre-seeded demo accounts. Click any of the **Demo Chip buttons** on the sign-in page to autofill these credentials instantly:

| Role | Email | Password | Access Rights |
| :--- | :--- | :--- | :--- |
| **Procurement Officer** | `officer@vb.com` | `officer123` | Create RFQs, view/invite vendors, compare quotes, issue POs, log invoices. |
| **Manager / Approver** | `manager@vb.com` | `manager123` | Review pending quotes, approve/reject purchases, check dashboard analytics. |
| **Vendor (Supplier)** | `v1@vendor.com` | `vendor123` | View invited RFQs, submit quotes, track awarded POs. |
| **Administrator** | `admin@vb.com` | `admin123` | Manage the user database, register vendors, and inspect full security/audit logs. |

---

## 📁 Repository Structure

```
Vendor_Apex/
├── apps/
│   ├── api/                 # Node.js Express Backend
│   │   ├── email.js         # Nodemailer template/sender service
│   │   ├── index.js         # REST endpoints and server entry point
│   │   ├── seed.js          # DB schema migration & mockup seeder
│   │   └── secure.js        # Script to enable RLS on table assets
│   └── web/                 # Vanilla JS & Vite Frontend
│       ├── public/          # Static stylesheets, icons, and assets
│       └── index.html       # Single Page Application entry point
├── dev.ps1                  # Port-cleaner & dev launcher script
├── package.json             # Root monorepo workspace package config
├── turbo.json               # Turborepo task pipeline configuration
└── README.md                # Project documentation
```
