# TradeLens single-container image (TL-DEPLOY-001).
# Stage 1 builds the Vite front end; stage 2 runs Flask under gunicorn and
# serves the built SPA from ../dist (see backend/app.py static hosting).
# Secrets NEVER enter this image — configuration comes from the environment
# (Container Apps Secrets in production, backend/.env locally, which is
# excluded via .dockerignore).

FROM node:22-alpine AS webbuild
WORKDIR /build
COPY package.json package-lock.json ./
RUN npm ci
COPY index.html vite.config.js ./
COPY src ./src
RUN npm run build

FROM python:3.13-slim
WORKDIR /app
COPY backend/requirements.txt backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt
COPY backend ./backend
# seed.py reads ../src/mock relative to backend/ — keep the same layout.
COPY src/mock ./src/mock
COPY --from=webbuild /build/dist ./dist
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

ENV FLASK_DEBUG=0 \
    TRUST_PROXY=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app/backend
EXPOSE 8000
ENTRYPOINT ["/docker-entrypoint.sh"]
