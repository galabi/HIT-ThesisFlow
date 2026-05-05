# HIT ThesisFlow

Full-stack thesis and final-project management system for the **Holon Institute of Technology**.
Manages the complete lifecycle — faculty proposal publishing → student applications → milestone submissions → grading → defense scheduling → automatic final grade calculation.

---

## Features

- **Proposals** — supervisors publish project proposals; students browse, filter, and apply with CV/transcript uploads
- **Applications** — supervisors review applications, approve/reject, or schedule meetings; approval automatically creates the project and all milestones
- **Milestones** — configurable per-faculty pipeline; each milestone has a dynamic grade form built by the coordinator
- **Grading** — supervisors and examiners fill dynamic forms (NUMBER / RUBRIC / BOOLEAN / TEXT fields); weighted final grade calculated automatically
- **Defense scheduling** — coordinator assigns examiners and schedules the defense exam
- **Notifications** — every status change triggers an in-app notification (Socket.io) and an email (Resend)
- **Multi-faculty** — each faculty has its own independently configured milestone pipeline and weight distribution

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite (SPA, JSX) |
| Backend | Node.js + Express (ESM) |
| Database | MongoDB + Prisma ORM |
| Auth | JWT (15 min) + httpOnly refresh cookie (7 days) |
| UI | shadcn/ui components + Tailwind CSS (RTL) |
| File Storage | Cloudflare R2 / AWS S3 via presigned URLs |
| Local Storage | MinIO (Docker) |
| Email | Resend |
| Real-time | Socket.io |
| Monorepo | npm workspaces |

---

## Prerequisites

- Node.js ≥ 22
- Docker + Docker Compose

---

## Getting Started

### 1. Clone and install

```bash
git clone <repo-url>
cd HIT-ThesisFlow
npm install
```

### 2. Start infrastructure (MongoDB + MinIO)

```bash
npm run docker:up
```

MongoDB starts as a replica set (required for Prisma transactions).
MinIO is available at `http://localhost:9001` (user: `minioadmin`, password: `minioadmin`).

### 3. Configure environment

```bash
cp server/.env.example server/.env
```

Edit `server/.env`:

```env
DATABASE_URL="mongodb://localhost:27017/hit-thesisflow?replicaSet=rs0&directConnection=true"

JWT_ACCESS_SECRET="change-me-at-least-32-chars-long"
JWT_REFRESH_SECRET="change-me-at-least-32-chars-long"

# MinIO (local dev)
S3_ENDPOINT="http://localhost:9000"
S3_BUCKET="hit-thesisflow"
S3_ACCESS_KEY_ID="minioadmin"
S3_SECRET_ACCESS_KEY="minioadmin"
S3_REGION="us-east-1"

# Optional — email via Resend
# RESEND_API_KEY="re_..."
```

> **MinIO bucket setup:** open `http://localhost:9001`, log in, create a bucket named `hit-thesisflow`, and set its access policy to **public** (for presigned URL support).

### 4. Push schema and seed the database

```bash
npm run db:push    # apply Prisma schema to MongoDB
npm run db:seed    # create 4 dev users
```

### 5. Run

```bash
npm run dev        # starts server (port 5000) + client (port 5173) in parallel
```

Open `http://localhost:5173`.

---

## Dev Credentials

| Email | Password | Role |
|---|---|---|
| coordinator@hit.ac.il | Password1! | PROJECT_COORDINATOR |
| supervisor@hit.ac.il | Password1! | SUPERVISOR |
| student@hit.ac.il | Password1! | STUDENT |
| examiner@hit.ac.il | Password1! | EXAMINER |

---

## Project Structure

```
hit-thesisflow/
├── shared/                  # @hit/shared — enums, Zod validators, gradeCalculator
├── server/
│   ├── prisma/
│   │   ├── schema.prisma    # full DB schema
│   │   └── seed.js
│   └── src/
│       ├── modules/
│       │   ├── auth/
│       │   ├── users/
│       │   ├── faculties/   # faculty CRUD, milestone configs, weights
│       │   ├── templates/   # grade form template builder
│       │   ├── proposals/   # proposals + applications lifecycle
│       │   ├── documents/   # presign / confirm / download
│       │   ├── projects/    # (Phase 4)
│       │   ├── grades/      # (Phase 4)
│       │   └── notifications/
│       ├── middleware/       # auth, rbac, error, validate
│       └── services/        # email, socket, storage, token
└── client/
    └── src/
        ├── api/             # axios wrappers per domain
        ├── hooks/           # TanStack Query hooks
        ├── pages/
        │   ├── auth/
        │   ├── dashboard/
        │   ├── proposals/   # list, detail, create, inbox
        │   ├── admin/       # faculty config, grade form builder
        │   └── projects/    # (Phase 4)
        ├── components/
        │   ├── layout/      # AppShell, Sidebar, TopBar
        │   ├── documents/   # FileUploadZone
        │   └── grades/      # DynamicGradeForm (Phase 4)
        └── store/           # Zustand: auth, notifications, ui
```

---

## API Overview

| Prefix | Description |
|---|---|
| `POST /api/v1/auth/...` | Register, login, refresh, logout |
| `GET/POST /api/v1/users` | User management |
| `GET/POST/PATCH /api/v1/faculties/:id/...` | Faculty CRUD, milestone configs, weights |
| `GET/PUT /api/v1/templates/:configId` | Grade form template builder |
| `GET/POST /api/v1/proposals/...` | Proposal CRUD + publish/close |
| `POST /api/v1/proposals/:id/applications/...` | Apply, approve, reject, request meeting |
| `POST /api/v1/documents/presign` | Get presigned S3 PUT URL |
| `POST /api/v1/documents/confirm` | Confirm upload, create Document record |
| `GET /api/v1/documents/:id/download` | Get presigned GET URL |
| `GET /api/v1/notifications` | In-app notifications |

---

## Implementation Status

| Phase | Scope | Status |
|---|---|---|
| 1 | Monorepo, auth, users, faculties, React shell | ✅ Done |
| 2 | Faculty config, MilestoneConfig, GradeFormTemplate, Weights UI | ✅ Done |
| 3 | Proposals, applications, document upload, notifications wired | ✅ Done |
| 4 | Milestone submissions, DynamicGradeForm, supervisor grading | Pending |
| 5 | Examiner assignment, defense scheduling, final grade | Pending |
| 6 | Full notification audit, HTML email templates | Pending |
| 7 | Rate limiting, Helmet, tests, Docker, production build | Pending |

---

## Key Design Decisions

**Why MongoDB?** The grade form schema is dynamic (each faculty defines its own fields), and MongoDB's document model handles variable-depth embedded structures without migrations.

**Why replica set in dev?** Prisma requires a MongoDB replica set to support multi-document transactions, which the notification pipeline uses.

**File upload flow:** client → `POST /presign` → direct PUT to S3/MinIO → `POST /confirm`. The server never handles the file binary, keeping memory usage low and offloading bandwidth to the storage layer.

**JWT refresh:** access token lives in Zustand (sessionStorage). On 401, the axios interceptor calls `POST /auth/refresh` (httpOnly cookie), updates the token, and retries the original request — transparent to all callers.
