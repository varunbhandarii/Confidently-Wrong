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

# Temporary build DB for static page generation
ARG DATABASE_URL_BUILD="file:/app/prisma/build.db"
RUN DATABASE_URL="${DATABASE_URL_BUILD}" npx prisma db push --skip-generate && \
    DATABASE_URL="${DATABASE_URL_BUILD}" npm run build && \
    rm -f /app/prisma/build.db

# Runtime DB path
ENV DATABASE_URL="file:/app/prisma/prod.db"

EXPOSE 3000

COPY <<'EOF' /app/entrypoint.sh
#!/bin/sh
set -e
echo "Pushing DB schema to $DATABASE_URL ..."
npx prisma db push --skip-generate
echo "Starting server ..."
exec npm start
EOF
RUN chmod +x /app/entrypoint.sh

CMD ["/app/entrypoint.sh"]
