FROM node:20-alpine
WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci
RUN npx prisma generate

COPY server ./server/
COPY tsconfig.json ./

ENV NODE_ENV=production
EXPOSE 8080

CMD ["npx", "tsx", "server/index.ts"]
