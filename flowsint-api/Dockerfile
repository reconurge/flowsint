FROM python:3.10

WORKDIR /app

COPY . .

RUN pip install --no-cache-dir -r requirements.txt git+https://github.com/soxoj/maigret ghunt

RUN apt-get update && \
    apt-get install -y git whois dnsutils curl && \
    rm -rf /var/lib/apt/lists/*

EXPOSE 5000

ENTRYPOINT ["/app/entrypoint.sh"]
