# Stage 1 — Build React
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2 — Run Express server
FROM node:20-alpine
WORKDIR /app
COPY server/package*.json ./server/
RUN cd server && npm install
COPY server/ ./server/
COPY --from=builder /app/dist ./public
EXPOSE 3000
CMD ["node", "server/index.js"]