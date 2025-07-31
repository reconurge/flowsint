FROM python:3.10

WORKDIR /app

# Install git and configure SSH for private repos
RUN apt-get update && \
    apt-get install -y git openssh-client && \
    rm -rf /var/lib/apt/lists/*

# Create SSH directory and configure git to use SSH
RUN mkdir -p /root/.ssh && \
    ssh-keyscan github.com >> /root/.ssh/known_hosts

COPY . .

# Use SSH for git operations during pip install
RUN pip install --no-cache-dir -r requirements.txt

RUN apt-get update && \
    apt-get install -y git whois dnsutils curl && \
    rm -rf /var/lib/apt/lists/*

EXPOSE 5000

ENTRYPOINT ["/app/entrypoint.sh"]
