# 🚀 Google Cloud Run & Secret Manager Deployment Guide

This guide details how to configure Google Cloud Platform (GCP) IAM permissions, store secrets, and deploy the FastAPI backend service to Google Cloud Run.

---

## 🔑 1. Setup GCP Secret Manager

The backend requires the `GEMINI_API_KEY` and the `DATABASE_URL` (Supabase connection) to be loaded securely. We mount these as env variables from Secret Manager.

Run these `gcloud` commands locally to create the secrets:

```bash
# Enable Secret Manager API
gcloud services enable secretmanager.googleapis.com

# Create GEMINI_API_KEY secret
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"
echo -n "your-gemini-api-key-here" | gcloud secrets versions add GEMINI_API_KEY --data-file=-

# Create DATABASE_URL secret (Supabase Postgres connection URI)
gcloud secrets create DATABASE_URL --replication-policy="automatic"
echo -n "postgresql://postgres:password@db.supabase.co:5432/postgres" | gcloud secrets versions add DATABASE_URL --data-file=-
```

---

## 🔒 2. Configure IAM Service Permissions

Ensure the default Compute Engine service account or Cloud Run service account has permissions to retrieve secret payloads:

```bash
# Get your GCP Project Number
PROJECT_NUMBER=$(gcloud projects describe $(gcloud config get-value project) --format="value(projectNumber)")

# Grant Secret Manager Secret Accessor to Compute Service Account
gcloud projects add-iam-policy-binding $(gcloud config get-value project) \
    --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"
```

---

## 📦 3. Manual Build & Deployment

If not triggering via GitHub Actions, deploy the service manually:

### A. Create the Artifact Registry repository
```bash
gcloud artifacts repositories create stadium-iq \
    --repository-format=docker \
    --location=us-central1 \
    --description="StadiumIQ Docker Repository"
```

### B. Submit Cloud Build
Run this from the project root directory:
```bash
gcloud builds submit --config=deployment/cloudbuild.yaml
```

---

## 🛠️ 4. Active Logs and Monitoring

To audit containers and view latency/resource usage:
```bash
# View active Cloud Run container logs
gcloud beta run services logs read stadium-iq-backend --region=us-central1 --limit=100

# View CPU/Memory telemetry
gcloud run services describe stadium-iq-backend --region=us-central1
```
