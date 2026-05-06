# HIT ThesisFlow

Full-stack thesis and final-project management system for the **Holon Institute of Technology**.
Manages the complete lifecycle — faculty proposal publishing → student applications → milestone submissions → grading → defense scheduling → automatic final grade calculation.

---

## Features

- **Proposals** — supervisors publish project proposals; students browse, filter, and apply with CV/transcript uploads
- **Applications** — supervisors review, approve/reject, or schedule meetings; approval automatically creates the project and all milestones
- **Milestones** — configurable per-faculty pipeline; each milestone has a dynamic grade form built by the coordinator
- **Grading** — supervisors and examiners fill dynamic forms (NUMBER / RUBRIC / BOOLEAN / TEXT); weighted final grade calculated automatically
- **Examiner assignment** — coordinator assigns 2 examiners per milestone; milestone auto-transitions to `EXAMINER_ASSIGNED`
- **Defense scheduling** — coordinator sets date/location/Zoom link; all parties notified automatically
- **Notifications** — every status change triggers an in-app notification (Socket.io) + per-type HTML email (Resend)
- **Multi-faculty** — each faculty has its own independently configured milestone pipeline and weight distribution

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite (SPA, JSX) |
| Backend | Node.js + Express (ESM) |
| Database | MongoDB + Prisma ORM |
| Auth | JWT (15 min) + httpOnly refresh cookie (7 days) |
| UI | shadcn/ui + Tailwind CSS (RTL, Hebrew) |
| File Storage | Cloudflare R2 / AWS S3 via presigned URLs |
| Local Storage | MinIO (Docker) |
| Email | Resend |
| Real-time | Socket.io |
| Monorepo | npm workspaces (`shared`, `server`, `client`) |

---

## Prerequisites

- Node.js ≥ 20
- Docker + Docker Compose

---

## Getting Started (Development)

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
MinIO console is at `http://localhost:9001` (user: `minioadmin` / `minioadmin`).

### 3. Configure environment

```bash
cp server/.env.example server/.env
```

Edit `server/.env`:

```env
DATABASE_URL="mongodb://localhost:27017/hit_thesisflow?replicaSet=rs0&directConnection=true"

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

> **MinIO bucket setup:** open `http://localhost:9001`, log in, create a bucket named `hit-thesisflow`, and set its access policy to **public**.

### 4. Push schema and seed

```bash
npm run db:push    # apply Prisma schema to MongoDB
npm run db:seed    # create 4 dev users
```

### 5. Run

```bash
npm run dev        # server (port 5001) + client (port 5173) in parallel
```

Open `http://localhost:5173`.

---

## Getting Started (Production — Docker)

```bash
cp server/.env.example server/.env   # fill JWT secrets + optional Resend key
docker compose up --build
```

The app is available at `http://localhost` (port 80).
The API server runs on port 5000 inside the compose network.

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
├── shared/                    # @hit/shared — enums, Zod validators, gradeCalculator
├── server/
│   ├── Dockerfile
│   ├── prisma/
│   │   ├── schema.prisma      # full DB schema
│   │   └── seed.js
│   └── src/
│       ├── modules/
│       │   ├── auth/
│       │   ├── users/
│       │   ├── faculties/     # faculty CRUD, milestone configs, weights
│       │   ├── templates/     # grade form template builder
│       │   ├── proposals/     # proposals + applications lifecycle
│       │   ├── documents/     # presign / confirm / download
│       │   ├── projects/      # project list, detail, milestone submit, coordinator approve
│       │   ├── grades/        # grade submission, score calculation
│       │   ├── milestones/    # examiner assignment
│       │   ├── schedule/      # defense exam scheduling
│       │   └── notifications/ # in-app notifications router + central service
│       ├── middleware/        # auth, rbac, error, validate
│       ├── services/          # email, socket, storage, token
│       └── tests/             # integration tests (vitest + supertest)
└── client/
    ├── Dockerfile
    ├── nginx.conf
    └── src/
        ├── api/               # axios wrappers per domain
        ├── hooks/             # TanStack Query hooks
        ├── pages/
        │   ├── auth/
        │   ├── dashboard/
        │   ├── proposals/     # list, detail, create, inbox
        │   ├── admin/         # faculty config, grade form builder
        │   ├── projects/      # list, detail, milestone detail
        │   └── notifications/ # full notification list
        ├── components/
        │   ├── layout/        # AppShell, Sidebar, TopBar
        │   ├── documents/     # FileUploadZone
        │   ├── grades/        # DynamicGradeForm
        │   └── ErrorBoundary.jsx
        └── store/             # Zustand: auth, notifications, ui
```

---

## API Overview

| Prefix | Description |
|---|---|
| `/api/v1/auth/...` | Register, login, refresh, logout, me |
| `/api/v1/users` | User management (coordinator only) |
| `/api/v1/faculties/:id/...` | Faculty CRUD, milestone configs, weights |
| `/api/v1/templates/:configId` | Grade form template builder |
| `/api/v1/proposals/...` | Proposal CRUD, publish/close, applications |
| `/api/v1/documents/...` | Presign, confirm, download |
| `/api/v1/projects/...` | Project list/detail, milestone submit, coordinator approve, grade summary |
| `/api/v1/grades/milestones/:id` | Submit grade, get all grades, get my grade |
| `/api/v1/assignments/...` | Examiner assignment CRUD |
| `/api/v1/schedule/defense/...` | Defense exam scheduling CRUD |
| `/api/v1/notifications/...` | List, mark read, mark all read |

All routes under `/api/v1` are rate-limited to 200 req / 15 min.
`/api/v1/auth` has a stricter limit of 30 req / 15 min.

---

## Running Tests

```bash
npm run test -w server     # 15 integration tests (requires Docker MongoDB running)
```

Test suites: `auth.test.js` · `proposals.test.js` · `milestones.test.js`

---


## Key Design Decisions

**Why MongoDB?** The grade form schema is dynamic (each faculty defines its own fields), and MongoDB's document model handles variable-depth structures without migrations.

**Why replica set in dev?** Prisma requires a MongoDB replica set to support multi-document transactions, which the notification pipeline uses.

**File upload flow:** client → `POST /presign` → direct PUT to S3/MinIO → `POST /confirm`. The server never handles the file binary, keeping memory usage low and offloading bandwidth to the storage layer.

**JWT refresh:** access token lives in Zustand (sessionStorage). On 401, the axios interceptor calls `POST /auth/refresh` (httpOnly cookie), updates the token, and retries the original request — transparent to all callers.

**Notification pipeline:** `sendNotifications()` in `notifications.service.js` is the single entry point for all status changes. It persists `Notification` rows, emits `notification:new` via Socket.io, and fires per-type HTML emails — all in one call.
