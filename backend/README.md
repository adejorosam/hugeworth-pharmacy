# Hugeworth Pharmacy Management System — Backend (Phase 1)

Real production backend for the Hugeworth PMS. NestJS + PostgreSQL + JWT auth.

This replaces the mock, localStorage-only demo in `../app/` for the features covered under
**Phase 1** of the signed proposal: Accounts & Roles (RBAC), Inventory Management, Sales/POS,
and Activity Log. Phase 2 (alerts, reports, invoice traceability, expiry block) and Phase 3
(customers, multi-branch, discounts, refunds) are built as separate stages once each prior
phase is demoed and invoiced, per the payment schedule.

## Setup

1. `cp .env.example .env` and fill in real values (DB credentials, a long random `JWT_SECRET`).
2. Create the database: `createdb hugeworth_pms` (or via your Postgres provider).
3. `npm install`
4. `npm run start:dev`
5. Create the first Admin account: `npm run seed`
   - Defaults to `admin@hugeworthpharmacy.com` / `ChangeMe123!` unless `SEED_ADMIN_EMAIL` /
     `SEED_ADMIN_PASSWORD` / `SEED_ADMIN_NAME` env vars are set.
   - **Log in and change this password immediately** via `PATCH /auth/change-password`.
   - Every other staff account is created by an Admin via `POST /staff` — there's no public
     signup endpoint.

API docs (Swagger): `http://localhost:<PORT>/docs` once the app is running.

## Roles

- **Admin**: everything — staff management, inventory, sales, activity log (all staff).
- **Pharmacist**: inventory, sales, their own activity.
- **Cashier**: sales only, their own activity.

## Data model (Phase 1)

- `staff` — name, email, password hash, role, active flag
- `product` — name, category, supplier, qty, minQty, price
- `sale` / `sale_item` — invoice number, cashier, line items, total
- `activity_log` — every mutating action, tied to the staff member who did it

## Before first production deploy

- `synchronize` is auto-disabled outside `NODE_ENV=production`, but that also means **no
  schema management happens automatically in production**. Generate and run a proper TypeORM
  migration for the initial schema before deploying — don't rely on `synchronize` against a
  real database with real data.
- Set a real `JWT_SECRET` (the `.env.example` placeholder is not safe to use as-is).
- Change the seeded Admin password immediately after first login.
- CORS is currently wide open (`app.enableCors()` with no options) — lock it down to the real
  frontend origin once that's decided.

## Not in Phase 1 (by design, matches the payment schedule)

Low stock/reorder alerts, EOD summary, reports, invoice lookup, expiry block, customer refill
reminders, multi-branch, discounts, and refunds are all Phase 2/3 scope — not built here yet.
