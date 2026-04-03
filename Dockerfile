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

# Build-time DB just for static page generation
ENV DATABASE_URL="file:/app/prisma/build.db"
RUN npx prisma db push --skip-generate && npm run build && rm -f /app/prisma/build.db

EXPOSE 3000

# Runtime: create DB at a fixed absolute path, then start
CMD ["sh", "-c", "mkdir -p /app/data && DATABASE_URL=file:/app/data/prod.db npx prisma db push --skip-generate && DATABASE_URL=file:/app/data/prod.db npm start"]
