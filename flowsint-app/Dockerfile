FROM node:24

WORKDIR /app

COPY package*.json ./
RUN yarn install

COPY . .

RUN yarn build
EXPOSE 5173

CMD ["yarn", "preview", "--", "--port", "5173"]
