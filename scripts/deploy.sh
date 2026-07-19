#!/bin/bash
# StadiumIQ AI - Production Unified Deployer script
set -e

echo "=========================================="
echo "      STADIUMIQ PRODUCTION DEPLOYER       "
echo "=========================================="

# Check for gcloud command
if ! command -v gcloud &> /dev/null; then
    echo "Error: gcloud CLI is not installed."
    exit 1
fi

# Check for firebase command
if ! command -v firebase &> /dev/null; then
    echo "Error: firebase-tools CLI is not installed (run: npm install -g firebase-tools)."
    exit 1
fi

PROJECT_ID=$(gcloud config get-value project)
if [ -z "$PROJECT_ID" ]; then
    echo "Error: No active Google Cloud Project detected in gcloud."
    exit 1
fi

echo "Active Google Cloud Project: $PROJECT_ID"
echo "Deploying backend to Cloud Run..."

# 1. Trigger Cloud Build deployment
gcloud builds submit --config=deployment/cloudbuild.yaml .

# 2. Extract Cloud Run endpoint URL
BACKEND_URL=$(gcloud run services describe stadium-iq-backend --region=us-central1 --format="value(status.url)")
echo "Backend successfully deployed to: $BACKEND_URL"

# 3. Compile and Deploy Frontend
echo "Preparing frontend assets..."
cd frontend

# Set the production backend URL environment variable for compilation
export VITE_API_BASE_URL="$BACKEND_URL"

npm install
npm run build

echo "Deploying assets to Firebase Hosting..."
firebase deploy --only hosting

echo "=========================================="
echo "          DEPLOYMENT COMPLETED!           "
echo "=========================================="
