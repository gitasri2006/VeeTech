FROM python:3.12-slim

WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONPATH=/app

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY services/global-discovery/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY services/common /app/services/common
COPY services/global-discovery /app/services/global-discovery

EXPOSE 8004

CMD ["uvicorn", "main:app", "--app-dir", "/app/services/global-discovery", "--host", "0.0.0.0", "--port", "8004"]
