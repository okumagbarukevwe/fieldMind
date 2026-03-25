# FieldMind — AI-Powered Field Operations Assistant

> Built for the PowerSync AI Hackathon 2026

FieldMind is a real-time, offline-capable AI assistant for field workers in industrial environments like oil & gas, utilities, mining, and manufacturing. It uses **PowerSync** as the core sync engine to deliver instant data synchronization between field devices and HQ, even without internet connectivity.

---

## Links

- **Live URL:** https://field-mind-eta.vercel.app
- **Demo Video:** https://youtu.be/xtHzpNWqVto
- **GitHub:** https://github.com/okumagbarukevwe/fieldMind

---

## The Problem

Field workers in industrial environments face three critical challenges:

1. **No connectivity** — oil rigs, mines, and remote sites have poor or no internet
2. **Slow incident response** — paper-based reporting delays emergency response
3. **No AI assistance** — workers lack instant access to equipment knowledge and safety guidance

FieldMind solves all three with a local-first architecture powered by PowerSync.

---

## How PowerSync Is Used

PowerSync is the **architectural backbone** of FieldMind not an add-on. Here is exactly how:

**1. Offline-First Incident Reporting**
Workers submit incidents to a local SQLite database via PowerSync. When connectivity returns, incidents automatically sync to Supabase. The worker never loses data.

**2. Real-Time HQ Dashboard**
PowerSync syncs incident updates, status changes, and HQ responses to all connected devices instantly. When an HQ manager marks an incident as "investigating", the worker sees it in under 100ms.

**3. Zone-Based Alert Broadcasting**
HQ broadcasts emergency alerts to all field workers simultaneously. PowerSync delivers these alerts to every connected device in real time critical for emergency evacuations.

**4. Two-Way Messaging**
HQ managers and workers communicate through incident threads. Messages are synced via PowerSync so both sides see updates instantly.

**5. Worker Location Tracking**
Worker check-ins are synced to a worker_locations table via PowerSync. HQ sees all active workers and their zones in real time.

**6. Equipment Health Sync**
Equipment health scores update automatically when incidents are reported. All devices see the latest equipment status via PowerSync sync rules.

**7. Safety Scores**
Worker safety scores are calculated by Mastra AI and synced via PowerSync so both workers and HQ managers see live scores.

---

## Architecture

```
Field Worker Device          PowerSync Cloud         HQ / Supabase
─────────────────           ───────────────         ──────────────
Local SQLite ←──────────── Sync Engine ────────────→ Postgres DB
     ↑                           ↑                        ↑
Voice Input                  Sync Rules              Mastra Agents
AI Chat (offline)            Conflict Res.           Analytics
QR Scanner                   Real-time push          Predictions
GPS Check-in                                         Reports
```

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Sync Engine | PowerSync | Local-first sync, offline support, real-time |
| Backend Database | Supabase (Postgres) | Source of truth, auth, realtime |
| AI Agents | Mastra + Groq (Llama 3.3 70B) | Triage, predictions, escalation, safety scores |
| Frontend | Next.js 15 + Tailwind CSS | Web application |
| Real-time | Supabase Realtime | Instant UI updates across all pages |
| Maps | Leaflet + OpenStreetMap | Live incident map with GPS markers |
| Charts | Recharts | Analytics and data visualizations |
| QR Scanning | html5-qrcode | Equipment QR code scanning |

---

## Features

### Field Worker Features

| Feature | Description | Technologies Used |
|---|---|---|
| Incident Reporting | Submit incidents with voice input and GPS location | PowerSync, Supabase, Web Speech API |
| AI Triage | Mastra agent analyzes severity, actions, and resources | Mastra, Groq |
| Offline Mode | Full functionality without internet, syncs when reconnected | PowerSync local SQLite |
| AI Chat | Personal AI assistant with full equipment knowledge | Groq, Supabase |
| Equipment Scanner | Scan QR code to see equipment health and recent incidents | PowerSync, Mastra |
| Manual Q&A | Chat interface for equipment manual questions | Groq, Supabase |
| GPS Check-In | Geofenced shift check-in (must be on site to check in) | Supabase, Geolocation API |
| My Incidents | Track reported incidents and messages from HQ | PowerSync, Supabase Realtime |
| Safety Score | AI-calculated personal safety score with assessment | Mastra, PowerSync |
| Live Alerts | Instant emergency alerts from HQ with sound notification | PowerSync, Supabase Realtime |
| HQ Messaging | Direct two-way communication with assigned HQ manager | PowerSync, Supabase |

### HQ Manager Features

| Feature | Description | Technologies Used |
|---|---|---|
| Live Dashboard | Real-time incident feed with filters and status management | PowerSync, Supabase Realtime |
| Incident Resolution | Mark incidents open, investigating, or resolved with notes | Supabase |
| Alert Broadcast | Send emergency alerts to all workers simultaneously | PowerSync, Supabase |
| Worker Tracking | See all active workers and their zones in real time | PowerSync, Supabase Realtime |
| Analytics | Charts showing incident trends, severity, and top reporters | Recharts, Supabase |
| Live Incident Map | All incidents plotted on real map with severity colors | Leaflet, PowerSync |
| AI Predictions | Mastra predicts future risks based on incident patterns | Mastra, Supabase |
| AI Risk Reports | Pattern analysis reports generated automatically by Mastra | Mastra, Supabase |
| Equipment Health | Real-time equipment health scores with AI safety assessment | PowerSync, Mastra |
| Safety Leaderboard | All workers safety scores ranked and synced live | PowerSync, Mastra |
| Auto-Escalation | Incidents open more than 10 minutes escalated automatically | Mastra, PowerSync |
| HQ Comments | Internal team collaboration on incidents | Supabase Realtime |
| Incident Assignment | Assign incidents to specific HQ managers | Supabase |

### Admin Features

| Feature | Description |
|---|---|
| User Management | Promote workers to HQ managers or demote managers to workers |
| Role-Based Access | Workers and managers see different UI and features |
| Profile Management | Full name, zone, notification preferences, password reset via email |

---

## Mastra AI Agents

FieldMind uses 6 distinct Mastra agent workflows:

**1. Triage Agent**
Analyzes every submitted incident. Returns severity level, emergency services flag, immediate action required, resources needed, response time estimate, and a step-by-step action plan.

**2. Pattern Detection Agent**
Analyzes the last 20 incidents and identifies recurring risks, dangerous patterns, and prevention recommendations for HQ.

**3. Prediction Agent**
Per-zone risk prediction. Analyzes incident history by zone and predicts future risks with confidence scores and specific recommended preventive actions.

**4. Auto-Escalation Agent**
Monitors open incidents every 60 seconds. Automatically escalates to CRITICAL and broadcasts an alert if an incident remains unresolved for 10 or more minutes.

**5. Safety Score Agent**
Calculates a worker safety score from 0 to 100 based on their incident history. Generates a constructive AI assessment with key strengths and areas for improvement.

**6. Equipment Health Agent**
Analyzes incidents linked to a specific piece of equipment and determines if it is safe to use, with specific precautions the worker should take.

---

## Database Schema

```
incidents          Core incident reports with GPS, zone, severity, status
ai_logs            Every AI prompt and response logged for observability
manuals            Equipment manuals (15 pieces of equipment)
messages           HQ to worker and worker to HQ direct messages
alerts             Broadcast alerts from HQ to all workers
worker_locations   Real-time worker check-ins and zone assignments
profiles           User profiles with roles and notification preferences
safety_scores      AI-calculated worker safety scores
reports            AI pattern analysis reports
predictions        Zone-based risk predictions
comments           HQ internal incident collaboration comments
chats              AI chat history per worker
equipment          Equipment with QR codes and real-time health scores
```

---

## PowerSync Sync Rules

```yaml
bucket_definitions:
  global:
    data:
      - SELECT * FROM incidents
      - SELECT * FROM ai_logs
      - SELECT * FROM manuals
      - SELECT * FROM messages
      - SELECT * FROM alerts
      - SELECT * FROM worker_locations
      - SELECT * FROM profiles
      - SELECT * FROM safety_scores
      - SELECT * FROM reports
      - SELECT * FROM predictions
      - SELECT * FROM comments
      - SELECT * FROM chats
      - SELECT * FROM equipment
```

---

## Bonus Prize Categories Entered

**Best Local-First Submission**
Workers operate fully offline with local SQLite. AI chat works offline with cached safety responses. Incidents queue locally and sync when connectivity returns. Offline banner shows sync status with queued item count.

**Best Using Supabase**
Supabase Postgres is the primary backend database. Supabase Auth handles email verification and role-based access. Supabase Realtime powers instant UI updates across all pages. A Supabase trigger automatically creates user profiles on signup.

**Best Using Mastra**
Six distinct Mastra agent workflows covering triage, prediction, auto-escalation, safety scoring, pattern detection, and equipment health assessment. Every Mastra response is logged to ai_logs via PowerSync for full observability.

---

## Getting Started

### Prerequisites

- Node.js 18 or higher
- Supabase account (free tier works)
- PowerSync account (free tier works)
- Groq API key (free at console.groq.com)

### Environment Variables

Create a `.env.local` file in the project root:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_POWERSYNC_URL=your_powersync_instance_url
GROQ_API_KEY=your_groq_api_key
```

### Installation

```bash
git clone https://github.com/yourusername/fieldmind
cd fieldmind
npm install
npx powersync-web copy-assets
npm run dev
```

Open http://localhost:3000 in your browser.

---

## Test Accounts

To test the app, create two accounts after setting up:

1. Sign up with any email to create a worker account
2. Go to /admin and promote one account to HQ Manager to access all HQ features

---

## Project Structure

```
fieldmind/
├── app/
│   ├── admin/            Admin panel with separate navbar
│   ├── analytics/        Analytics dashboard with live map
│   ├── api/
│   │   ├── alerts/       Alert broadcast CRUD
│   │   ├── chat/         AI chat with context
│   │   ├── comments/     HQ internal comments
│   │   ├── dashboard/    Incidents feed for HQ
│   │   ├── equipment/    Equipment health tracking
│   │   ├── escalate/     Auto-escalation workflow
│   │   ├── incidents/    Incident submission
│   │   ├── logs/         AI observability logs
│   │   ├── manual/       Equipment manual Q&A
│   │   ├── mastra/       Mastra triage agent
│   │   ├── messages/     HQ to worker messaging
│   │   ├── my-incidents/ Worker's own incidents
│   │   ├── pattern/      Pattern detection reports
│   │   ├── predict/      Zone risk predictions
│   │   ├── safety-score/ Worker safety scoring
│   │   └── zone-alert/   Zone-based notifications
│   ├── chat/             AI chat page
│   ├── checkin/          GPS-verified check-in
│   ├── dashboard/        HQ live dashboard
│   ├── demo/             Live sync demonstration
│   ├── equipment/        Equipment health page
│   ├── login/            Authentication page
│   ├── manual/           Equipment manual chat
│   ├── map/              Live incident map component
│   ├── mastra/           Mastra agent configuration
│   ├── my-incidents/     Worker incident tracker
│   ├── predictions/      AI risk predictions
│   ├── profile/          User profile with tabs
│   ├── reports/          AI pattern reports
│   ├── safety/           Safety score page
│   ├── scan/             QR equipment scanner
│   ├── utils/            Supabase client utilities
│   └── workers/          HQ worker tracking
├── public/
│   └── @powersync/       PowerSync WASM assets
└── README.md
```

---

## Team

Built solo by **OKUMAGBA OGHENERUKEVWE MIRACLE** for the PowerSync AI Hackathon 2026.

---

## License

MIT
