FROM python:3.11-slim

# Install system deps for mysql-connector and lxml
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libssl-dev \
    libffi-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Default command — Railway cron will override this
CMD ["python3", "smart_pipeline.py", "--phase", "all"]
