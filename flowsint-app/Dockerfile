# Étape 1 – Build Vite + Electron
FROM node:20 AS builder

WORKDIR /app

# Copie et install
COPY package*.json ./
RUN npm install

COPY . .

# Vérification de type + build
RUN npm run typecheck
RUN npm run build -y

# Build de l'app avec electron-builder (non packagée)
RUN npm run build:unpack

# Étape 2 – Image finale avec l'app prête
FROM node:20-slim

# Dépendances d'Electron requises pour s'exécuter dans un conteneur
RUN apt-get update && apt-get install -y \
    libgtk-3-0 \
    libx11-xcb1 \
    libnss3 \
    libxcomposite1 \
    libxrandr2 \
    libasound2 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libgbm1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxkbcommon0 \
    libxshmfence1 \
    libglu1-mesa \
    x11-xserver-utils \
    --no-install-recommends && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/out ./out
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

CMD ["npx", "electron", "."]
