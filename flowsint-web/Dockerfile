FROM node:18
WORKDIR /app
COPY package.json yarn.lock ./
RUN pnpm install
COPY . .
EXPOSE 3000
CMD ["yarn", "dev"]
