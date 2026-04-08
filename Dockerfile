FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci

# Generate Prisma client before compiling TypeScript
RUN npx prisma generate

COPY tsconfig.json ./
COPY src ./src/

RUN npm run build

# --- Production image ---
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci --omit=dev

# Generate Prisma client in production image
RUN npx prisma generate

# Copy compiled output from builder
COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["node", "dist/index.js"]
