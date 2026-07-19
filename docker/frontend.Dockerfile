FROM node:20-alpine

WORKDIR /app

# Copy package descriptors
COPY frontend/package.json .
COPY frontend/package-lock.json* ./

RUN npm install

# Copy source files
COPY frontend/ .

EXPOSE 3000

# Run Vite dev server bound to all interfaces
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
