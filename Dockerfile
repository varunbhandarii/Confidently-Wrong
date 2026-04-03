FROM node:20-slim

RUN apt-get update && \
    apt-get install -y --no-install-recommends ffmpeg openssl && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY . .

# Build-time: temp DB for static page generation
RUN DATABASE_URL="file:/app/prisma/build.db" npx prisma db push --skip-generate && \
    DATABASE_URL="file:/app/prisma/build.db" npm run build && \
    rm -f /app/prisma/build.db

ENV DATABASE_URL="file:/app/prisma/prod.db"

EXPOSE 3000

CMD ["npm", "start"]
