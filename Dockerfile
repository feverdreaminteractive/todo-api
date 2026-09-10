# --- build stage: compile TypeScript with dev dependencies available ---
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# --- runtime stage: production dependencies + compiled output only ---
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist

# JsonFileTodoRepository auto-creates data/todos.json on first write, but
# the non-root `node` user (built into the base image) needs write access
# to /app for that -- chown before dropping root.
RUN chown -R node:node /app
USER node

ENV PORT=3000
ENV DATA_FILE=/app/data/todos.json
EXPOSE 3000

CMD ["node", "dist/server.js"]
