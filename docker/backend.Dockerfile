FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy and install python requirements
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application files and scripts
COPY backend/ ./backend/
COPY scripts/ ./scripts/
COPY deployment/startup.sh ./deployment/startup.sh

# Set startup script as executable
RUN chmod +x ./deployment/startup.sh

EXPOSE 8000

ENV PYTHONUNBUFFERED=1

ENTRYPOINT ["/bin/bash", "./deployment/startup.sh"]
