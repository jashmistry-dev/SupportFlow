# SUPPORTFLOW — Technical Support Management System

A practical, robust, and reliable technical support system built for internal company operations.

---

## 1. Problem

Support requests often arrive through scattered channels such as messaging apps, fragmented emails, or verbal calls. In this unstructured environment:
- Critical debugging information (exact error messages, reproduction steps, expected vs. actual behaviors) is routinely missing.
- Nobody clearly owns the issue, causing tickets to stall in limbo.
- Requesters have no visibility into current triage and resolution statuses.
- Previous troubleshooting steps and investigative history are forgotten, leading to duplicated effort.

SupportFlow replaces this chaos with a disciplined, straightforward workflow that preserves complete historical auditability.

---

## 2. Solution

SupportFlow provides an end-to-end technical support lifecycle:

```text
Requester raises guided support request
           ↓
Support team receives ticket in queue
           ↓
Ticket is prioritized (Low / Medium / High / Urgent)
           ↓
Ticket is assigned to a support engineer
           ↓
Support agent investigates diagnostics
           ↓
Agent and requester communicate in threaded conversation
           ↓
Evidence (screenshots & screen recording videos) attached
           ↓
Agent optionally triggers advisory Gemini AI summary
           ↓
Ticket is marked RESOLVED
           ↓
Requester confirms and marks CLOSED
           ↓
Full immutable history audit remains available
```

---

## 3. Key Features

- **Guided Ticket Creation UX:** Easy 4-section form grouping (Problem details, Diagnostic context, Evidence attachments, Priority) without overwhelming forms.
- **Evidence Attachments:** Support for images (JPG, PNG, WEBP up to 5MB) and video screen recordings (MP4, WEBM, MOV up to 25MB) with safe server-side storage and preview playback.
- **Strict Status Workflow & Transitions:** Enforces valid transitions (`OPEN` → `IN_PROGRESS` → `WAITING_FOR_REQUESTER` → `IN_PROGRESS` → `RESOLVED` → `CLOSED`). Prevents invalid leaps (e.g. `CLOSED` cannot directly become `IN_PROGRESS`).
- **Comprehensive History Audit Trail:** Every event (`CREATED`, `ASSIGNED`, `STATUS_CHANGED`, `PRIORITY_CHANGED`, `COMMENT_ADDED`, `ATTACHMENT_ADDED`, `AI_SUMMARY_GENERATED`) is logged in transactional timeline events.
- **Advisory Gemini AI Summaries:** Server-side Gemini 3.1 Flash Lite (`gemini-3.1-flash-lite`) generating structured summaries (Issue Summary, Impact, What Has Been Tried, Current Situation, Missing Information, Suggested Troubleshooting Steps). Strictly advisory without hallucinating root causes, with a 25s server timeout and 30s client timeout.
- **Role-Based Access Control (RBAC):** Clean 3-role authorization (`REQUESTER`, `SUPPORT_AGENT`, `ADMIN`) with backend data isolation.
- **Real-Time Backend Search & Filtering:** Filter by ticket number, keyword, status, priority, category, and assignee directly through PostgreSQL SQL queries.
- **Internal Enterprise IT Helpdesk Interface:** Clean, restrained Zendesk/Jira Service Management style UI without gradients or demo-like artifacts.

---

## 4. Technology Stack

- **Frontend:** React 19, Vite, TypeScript, React Router 7, Axios, Tailwind CSS, Lucide Icons.
- **Backend:** Node.js, Express 4, REST APIs, JSON Web Tokens (JWT), Bcrypt password hashing, Multer file upload handling.
- **Database:** PostgreSQL with Drizzle ORM and connection pooling (`pg.Pool`).
- **AI Engine:** Google Gemini API (`@google/genai` TypeScript SDK with `gemini-3.1-flash-lite`) called strictly server-side with structured JSON schemas and timeout protection.
- **DevOps:** Docker, Docker Compose.

---

## 5. Architecture Diagrams

### System Architecture
```text
┌────────────────────────────────────────────────────────┐
│                   React 19 Frontend                    │
│    (Dashboard, Ticket Queue, Guided Form, Lightbox)    │
└───────────────────────────┬────────────────────────────┘
                            │ REST API (JSON / Multipart)
                            ▼
┌────────────────────────────────────────────────────────┐
│                 Node.js + Express API                  │
│  (JWT Auth, RBAC Middleware, Multer, Error Handling)   │
└─────────────┬───────────────────────────┬──────────────┘
              │                           │
              ▼                           ▼
┌───────────────────────────┐ ┌──────────────────────────┐
│    PostgreSQL Database    │ │    Google Gemini API     │
│ (Users, Tickets, Events,  │ │ (Advisory Ticket Summary │
│    Comments, Attachments) │ │   Structured JSON Output)│
└───────────────────────────┘ └──────────────────────────┘
```

### Attachment Workflow
```text
React (File Picker / Preview)
     ↓ (Multipart/form-data)
Node.js + Multer (Validation: Size & MIME filter)
     ↓
File Storage Abstraction (Safe server-side filename, no path traversal)
     ↓
PostgreSQL `attachments` table + `ticket_events` audit event
```

### AI Summary Workflow
```text
Support Engineer clicks "Generate AI Summary"
     ↓
Node.js backend gathers ticket description, context, comments, and images
     ↓
Calls Gemini API (`gemini-3.8-flash`) with strict advisory system prompt
     ↓
Gemini returns structured JSON
     ↓
Backend validates response & persists to `tickets.ai_summary`
     ↓
Frontend renders collapsible engineering diagnostic card
```

---

## 6. Database Design

```sql
-- Users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL, -- 'REQUESTER' | 'SUPPORT_AGENT' | 'ADMIN'
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tickets table
CREATE TABLE tickets (
  id SERIAL PRIMARY KEY,
  ticket_number TEXT NOT NULL UNIQUE, -- 'SF-1001'
  requester_id INTEGER NOT NULL REFERENCES users(id),
  assignee_id INTEGER REFERENCES users(id),
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  priority TEXT NOT NULL, -- 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  status TEXT NOT NULL DEFAULT 'OPEN', -- 'OPEN' | 'IN_PROGRESS' | 'WAITING_FOR_REQUESTER' | 'RESOLVED' | 'CLOSED'
  trying_to_do TEXT,
  expected_result TEXT,
  actual_result TEXT,
  error_message TEXT,
  affected_module TEXT,
  attempted_solution TEXT,
  ai_summary TEXT,
  ai_generated_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP,
  closed_at TIMESTAMP
);

-- Comments table
CREATE TABLE comments (
  id SERIAL PRIMARY KEY,
  ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id),
  body TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Attachments table
CREATE TABLE attachments (
  id SERIAL PRIMARY KEY,
  ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  uploaded_by INTEGER NOT NULL REFERENCES users(id),
  original_name TEXT NOT NULL,
  stored_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Ticket History Events table
CREATE TABLE ticket_events (
  id SERIAL PRIMARY KEY,
  ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id),
  event_type TEXT NOT NULL, -- 'CREATED' | 'ASSIGNED' | 'STATUS_CHANGED' | 'PRIORITY_CHANGED' | 'COMMENT_ADDED' | 'ATTACHMENT_ADDED' | 'AI_SUMMARY_GENERATED'
  old_value TEXT,
  new_value TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 7. REST API Overview

| Method | Endpoint | Description | Permitted Roles |
|---|---|---|---|
| `POST` | `/api/auth/register` | Register new employee account | Public |
| `POST` | `/api/auth/login` | Authenticate and obtain JWT token | Public |
| `GET` | `/api/auth/me` | Fetch authenticated profile | Authenticated |
| `GET` | `/api/auth/demo-users` | Fetch demo accounts for 1-click test switcher | Public |
| `GET` | `/api/tickets` | List tickets with query search & filter | Authenticated (Requesters see own) |
| `GET` | `/api/tickets/:id` | Fetch ticket details, comments, history | Authenticated (Access checks apply) |
| `POST` | `/api/tickets` | Create a new technical support ticket | Authenticated |
| `PATCH` | `/api/tickets/:id/status` | Execute validated status workflow transition | Requesters (Close resolved), Agents, Admins |
| `PATCH` | `/api/tickets/:id/priority` | Update ticket priority | Support Agents, Admins |
| `PATCH` | `/api/tickets/:id/assign` | Assign or reassign ticket owner | Support Agents, Admins |
| `GET` | `/api/tickets/:id/comments` | List ticket conversation comments | Authenticated ticket viewers |
| `POST` | `/api/tickets/:id/comments` | Post a comment to ticket discussion | Authenticated ticket viewers |
| `POST` | `/api/tickets/:id/attachments` | Upload image or video evidence (Multipart) | Authenticated ticket viewers |
| `DELETE` | `/api/attachments/:id` | Remove attachment file & record | Uploader, Agent, Admin |
| `GET` | `/api/dashboard/summary` | Aggregate dashboard KPI metrics | Authenticated |
| `POST` | `/api/tickets/:id/ai-summary` | Generate advisory Gemini AI summary | Support Agents, Admins |
| `GET` | `/api/users/agents` | List agents for assignment dropdowns | Authenticated |
| `GET` | `/api/users` | List company users | Admins |
| `PATCH` | `/api/users/:id/role` | Update user authorization role | Admins |

---

## 8. Authentication and RBAC

Authentication uses signed JSON Web Tokens (JWT) stored client-side in standard storage with Bearer headers. Passwords are securely hashed with `bcryptjs` (salt rounds: 10).

Roles:
1. **REQUESTER**:
   - Create tickets with guided diagnostic inputs.
   - View only own tickets.
   - Upload evidence (screenshots, videos).
   - Participate in ticket conversation.
   - Close resolved tickets.
2. **SUPPORT_AGENT**:
   - Access complete support queue.
   - Assign tickets to self or colleagues.
   - Advance statuses through diagnostic lifecycle.
   - Update priority levels.
   - Trigger advisory Gemini AI summary.
   - Resolve tickets.
3. **ADMIN**:
   - Full global visibility into all company tickets.
   - Reassign any ticket.
   - Manage users and delegate roles.
   - View system dashboard.

---

## 9. Demo Users (Pre-seeded in PostgreSQL)

The seed script automatically populates 6 realistic users and 8 demo tickets:

| Role | Name | Email | Password | Responsibility |
|---|---|---|---|---|
| **ADMIN** | Sarah Jenkins | `admin@supportflow.internal` | `admin123456` | Full admin & user management |
| **SUPPORT_AGENT** | Marcus Vance | `agent.marcus@supportflow.internal` | `agent123456` | Support engineer (investigation & AI) |
| **SUPPORT_AGENT** | Priya Sharma | `agent.priya@supportflow.internal` | `agent123456` | Support engineer (infrastructure) |
| **REQUESTER** | Alex Rivera | `alex.dev@acme.internal` | `requester123456` | Software Developer |
| **REQUESTER** | Elena Rostova | `elena.ops@acme.internal` | `requester123456` | DevOps Engineer |
| **REQUESTER** | David Chen | `david.finance@acme.internal` | `requester123456` | Financial Analyst |

*Note: You can switch between any of these personas in 1 click using the "Switch Role" button in the navigation bar!*

---

## 10. Automated Testing

SupportFlow includes an automated integration test suite verifying core business rules:

```bash
npm test
```

Test cases verified:
1. ✓ Login works and issues valid JWT.
2. ✓ Unauthenticated API requests return 401 Unauthorized.
3. ✓ Requester can create a ticket with unique ticket number.
4. ✓ Requester cannot access another user's private ticket (403 Forbidden).
5. ✓ Support agent can assign and update permitted tickets.
6. ✓ Status changes create transactional history events.
7. ✓ Invalid status transitions (e.g. `IN_PROGRESS` → `CLOSED`) are rejected (400 Bad Request).
8. ✓ Invalid attachment file formats and sizes are rejected.
9. ✓ AI failures are handled gracefully without corrupting or breaking the ticket.

---

## 11. Local Setup & Docker Setup

### Local Development:
```bash
# 1. Install dependencies
npm install

# 2. Seed database
npm run seed

# 3. Start development server (port 3000)
npm run dev

# 4. Run automated tests
npm test
```

### Docker Setup:
```bash
# Start PostgreSQL and SupportFlow application together
docker compose up --build
```
The application will be live at `http://localhost:3000`.
