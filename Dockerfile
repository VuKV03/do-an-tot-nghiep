# ============================================
# SmartTest Backend — Production Dockerfile
# Shared image for all 6 Python microservices
# ============================================
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for MySQL client
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc default-libmysqlclient-dev pkg-config curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source code only
COPY backend/ ./backend/
COPY .env.production ./.env

# Expose default gateway port (overridden per service)
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:${PORT:-8000}/health || exit 1

# Default command (overridden by docker-compose per service)
CMD ["python", "-m", "uvicorn", "backend.gateway.main:app", "--host", "0.0.0.0", "--port", "8000"]
