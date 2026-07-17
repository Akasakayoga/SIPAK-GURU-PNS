# Production Dockerfile for Railway Deployments
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package configuration files
COPY package*.json ./

# Install all dependencies
RUN npm ci

# Copy full application codebase
COPY . .

# Build Vite frontend assets and bundle Express backend
RUN npm run build

# --- Runtime stage ---
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy production package file
COPY package*.json ./

# Install only production dependencies to keep image footprint small
RUN npm ci --only=production

# Copy production build outputs
COPY --from=builder /app/dist ./dist

# Expose server port
EXPOSE 3000

# Start server using bundled output
CMD ["npm", "run", "start"]
