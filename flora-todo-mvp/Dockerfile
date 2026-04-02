FROM node:22-alpine

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5432/flora_todo_mvp
ENV APP_TIMEZONE=Asia/Seoul
ENV AUTOMATION_API_KEY=build-placeholder

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

RUN npm run build

EXPOSE 3000

CMD ["sh", "-lc", "node --import tsx scripts/db-migrate.ts && npm run start -- --hostname 0.0.0.0 --port 3000"]
