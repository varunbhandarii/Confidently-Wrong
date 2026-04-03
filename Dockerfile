FROM node:20-slim

RUN apt-get update && \
    apt-get install -y --no-install-recommends ffmpeg openssl && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate
ENV DATABASE_URL="file:./prisma/dev.db"
RUN npx prisma db push --skip-generate

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
