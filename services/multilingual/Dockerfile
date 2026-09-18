FROM python:3.12-slim

WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONPATH=/app

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY services/multilingual/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY services/common /app/services/common
COPY services/multilingual /app/services/multilingual

EXPOSE 8005

CMD ["uvicorn", "main:app", "--app-dir", "/app/services/multilingual", "--host", "0.0.0.0", "--port", "8005"]
