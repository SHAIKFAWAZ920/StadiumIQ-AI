# StadiumIQ AI – GenAI Smart Stadium & Tournament Operations Platform

StadiumIQ AI is a production-ready smart stadium operations assistant designed for the FIFA World Cup 2026 Hackathon. It integrates real-time telemetry simulations, Google Maps satellite tracking, Google Firebase (Auth, Firestore, Hosting, Storage), Supabase PostgreSQL, and Google Gemini AI to assist Fans, Volunteers, Security, Medical, Transport, and Operations teams.

---

## 🏗️ System Architecture

```mermaid
graph TD
    classDef client fill:#0d2d63,stroke:#0df270,stroke-width:2px,color:#fff;
    classDef gateway fill:#062f4f,stroke:#f59e0b,stroke-width:2px,color:#fff;
    classDef cloud fill:#0f3f61,stroke:#3b82f6,stroke-width:2px,color:#fff;
    
    subgraph Frontend [Vite React Client - Firebase Hosting]
        FA[Firebase Client Auth]:::client
        GM[Google Maps API Satellites]:::client
        FL[Firestore Real-Time Listeners]:::client
        UI[Glassmorphic Console Panels]:::client
    end
    
    subgraph Gateway [FastAPI Server - Google Cloud Run]
        AP[FastAPI Router Gateway]:::gateway
        FMA[Firebase Token Validator]:::gateway
        SIM[Live Telemetry Simulator]:::gateway
        GEM[Gemini Client proxy API]:::gateway
        RAG[Local Vector FAQ Search]:::gateway
    end

    subgraph Storage [Persistent Storage & Databases]
        SUP[Supabase Postgres DB]:::cloud
        FS[Google Firestore NoSQL]:::cloud
        ST[Firebase Cloud Storage]:::cloud
    end

    %% Flow lines
    FA -->|JWT Token Exchange| FMA
    UI -->|API calls with JWT Bearer| AP
    FL -->|Listen updates| FS
    SIM -->|Pushes telemetry updates| FS
    AP -->|Postgres transaction read/write| SUP
    GEM -->|Multimodal / Prompts calls| GCP[Google Gemini API]
    RAG -.->|Pinecone Upgrade Pathway| PIN[Enterprise Vector DB]
    ST -->|Image uploads/downloads| UI
    AP -->|Updates state/incidents| FS
```

---

## 🛠️ Technology Stack

* **Frontend**: React 18, Vite, TailwindCSS (glassmorphic styling), Framer Motion, Recharts, `@react-google-maps/api`, Firebase Client.
* **Backend**: FastAPI, SQLAlchemy (PostgreSQL & SQLite dialect), Gunicorn/Uvicorn, `firebase-admin`, `google-genai`.
* **Database & Sockets**: Supabase (PostgreSQL tables & Row-level security), Google Firestore (real-time live synchronization sockets).
* **Storage**: Firebase Storage (Incident pictures, reports, and CCTV snapshots).
* **AI Engine**: Google Gemini API (`gemini-2.5-flash`), local token-based TF-IDF FAQ retrieval system (Vector RAG).
* **DevOps**: Docker, Docker Compose, Google Cloud Build, Google Cloud Run, Secret Manager, GitHub Actions (CI/CD).

---

## 📦 Project Directory Structure

```
stadium-iq/
├── .github/workflows/
│   └── ci-cd.yml             # GitHub Actions CI/CD automation pipeline
├── backend/
│   ├── main.py               # FastAPI gateway with background simulator task
│   ├── requirements.txt      # Python package requirements
│   ├── api/                  # FastAPI router endpoints (Auth, Chat, Crowd, Incidents...)
│   ├── database/             # connection, engine setup, and schemas mappings
│   ├── ai/                   # Gemini clients, RAG text embedders, and templates
│   └── services/             # Firestore real-time cloud data push handlers
├── frontend/
│   ├── src/
│   │   ├── components/       # StadiumMap (Google Maps / SVG fallback), ChatBot
│   │   ├── pages/            # Login Portal, role-specific Dashboards
│   │   ├── services/         # Axios client and Firebase configurations
│   │   └── hooks/            # useSimulation (Firestore live sockets hooks)
│   ├── firebase.json         # Firebase Hosting SPA SPA rewrites
│   └── .firebaserc           # Firebase target mappings
├── database/
│   ├── schema.sql            # Supabase PostgreSQL tables schema
│   ├── rls_policies.sql      # Row Level Security configuration
│   └── indexes.sql           # Query acceleration indexes
├── deployment/
│   ├── cloudbuild.yaml       # Cloud Build orchestration steps
│   ├── startup.sh            # Gunicorn production container startup script
│   └── CloudRun.md           # Manual gcloud setup commands handbook
├── scripts/
│   ├── deploy.sh             # Unified deployment executable script
│   └── seed_supabase.py      # Supabase database table populator
├── docs/
│   └── Pinecone_Upgrade.md   # Pinecone/Weaviate production upgrade steps
├── .env.example
├── .gitignore
├── LICENSE
└── README.md
```

---

## 🔑 Environment Variables Setup

Create a `.env` file in the root directory:

```env
# Database Settings
DATABASE_URL=postgresql://postgres:your-supabase-password@db.supabase.co:5432/postgres
JWT_SECRET_KEY=stadium_iq_fifa_2026_secret_key_super_secure

# GenAI Settings
GEMINI_API_KEY=AIzaSyYourGeminiApiKeyHere

# Google Maps API
VITE_GOOGLE_MAPS_API_KEY=AIzaSyYourGoogleMapsApiKeyHere

# Firebase Client SDK Settings
VITE_FIREBASE_API_KEY=AIzaSyYourFirebaseClientApiKey
VITE_FIREBASE_AUTH_DOMAIN=stadium-iq-ai.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=stadium-iq-ai
VITE_FIREBASE_STORAGE_BUCKET=stadium-iq-ai.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=1234567890
VITE_FIREBASE_APP_ID=1:1234567890:web:abcdef123456
```

---

## 🚀 Execution & Command Manual

### 1. Local Development Execution

#### A. Backend Setup
```bash
# Setup virtual environment
python -m venv venv
.\venv\Scripts\activate

# Install requirements
pip install -r backend/requirements.txt

# Run server locally
uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```

#### B. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Open your browser to [http://localhost:3000](http://localhost:3000).

### 2. Docker & Containerized Commands
```bash
# Build and run containers locally
docker-compose up --build

# Run in background (detached)
docker-compose up -d

# View log outputs
docker-compose logs -f backend

# Turn off containers and purge volumes
docker-compose down -v
```

### 3. Database & Supabase Integration
Run these queries in your **Supabase SQL Editor** to initialize schemas:
1. Copy and execute content of [schema.sql](file:///c:/Users/shaik/Desktop/3348/INTER/PROJECTS/stadium%20IQ/database/schema.sql)
2. Copy and execute content of [rls_policies.sql](file:///c:/Users/shaik/Desktop/3348/INTER/PROJECTS/stadium%20IQ/database/rls_policies.sql)
3. Copy and execute content of [indexes.sql](file:///c:/Users/shaik/Desktop/3348/INTER/PROJECTS/stadium%20IQ/database/indexes.sql)

Seed tables remotely:
```bash
python scripts/seed_supabase.py
```

### 4. Cloud Deployments

#### A. Google Cloud Run (Backend)
```bash
# Set active project
gcloud config set project stadium-iq-ai

# Push Docker image and deploy to Cloud Run using Cloud Build
gcloud builds submit --config=deployment/cloudbuild.yaml .
```

#### B. Firebase Hosting (Frontend)
```bash
# Login and install hosting configurations
firebase login
cd frontend
npm run build
firebase deploy --only hosting
```

### 5. Automated CI/CD (GitHub Actions)
Trigger builds automatically by checking in changes:
```bash
git add .
git commit -m "feat: configure Firestore and Google Maps deployment"
git push origin main
```
The workflow will:
1. Run backend pytest tests.
2. Compile React Vite bundles.
3. Build the Docker image on Cloud Build and release to Cloud Run.
4. Push static builds to Firebase Hosting.

### 6. Container Rollbacks
In the event of a production failure:
```bash
# Rollback Cloud Run to a previous stable revision
gcloud run services update-traffic stadium-iq-backend --region=us-central1 --to-revisions=stadium-iq-backend-revision-id=100
```
Check status:
```bash
gcloud run services describe stadium-iq-backend --region=us-central1
```

---

## 🔮 Future Enhancements
- Upgrade in-memory TF-IDF context retrieval to **Pinecone Serverless Indexing** (instructions in [Pinecone_Upgrade.md](file:///c:/Users/shaik/Desktop/3348/INTER/PROJECTS/stadium%20IQ/docs/Pinecone_Upgrade.md)).
- Integrate dynamic AI translation broadcast via WebRTC audio channels.
- Expand Google Maps styling to incorporate real-time GPS coordinates of transit buses.

---

## 👥 Owner & Contact
- **Owner**: Shaik Fawaz
- **GitHub**: [@SHAIKFAWAZ920](https://github.com/SHAIKFAWAZ920)
- **Email**: shaikfawaz920@gmail.com
- **Project Link**: [https://github.com/SHAIKFAWAZ920/StadiumIQ-AI](https://github.com/SHAIKFAWAZ920/StadiumIQ-AI)

---

## 📄 License
This project is licensed under the MIT License - see the [LICENSE](file:///c:/Users/shaik/Desktop/3348/INTER/PROJECTS/stadium%20IQ/LICENSE) file for details.
