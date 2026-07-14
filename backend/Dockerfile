FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV HF_HOME=/app/.cache/huggingface

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    && rm -rf /var/lib/apt/lists/*

# Set work directory
WORKDIR /app

# Create user and group
RUN groupadd -g 10001 appgroup && \
    useradd -r -u 10001 -g appgroup -d /app -s /sbin/nologin appuser

# Copy requirements and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Create cache directory, sandbox directory, and grant permission to appuser
RUN mkdir -p /app/.cache/huggingface /app/sandbox && \
    chown -R appuser:appgroup /app

# Switch to non-root user
USER appuser

# Pre-download and cache CodeBERT model
RUN python -c "from transformers import AutoTokenizer, AutoModelForMaskedLM; AutoTokenizer.from_pretrained('microsoft/codebert-base-mlm'); AutoModelForMaskedLM.from_pretrained('microsoft/codebert-base-mlm')"

# Copy the rest of the application code
COPY --chown=appuser:appgroup . .

# Expose API port
EXPOSE 8000

# Health check configuration
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1

# Start the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
