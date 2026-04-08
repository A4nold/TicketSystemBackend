FROM node:24-bookworm-slim

WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./
COPY tsconfig.json ./

RUN npm ci

COPY src ./src
COPY _bmad-output ./_bmad-output

RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start:prod"]
