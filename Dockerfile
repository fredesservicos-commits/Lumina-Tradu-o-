FROM node:20-slim

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm ci --only=production && \
    npm cache clean --force

COPY dist ./dist
COPY server.js ./
COPY web.config ./
COPY .env .

EXPOSE 8080

CMD ["sh", "-c", "NODE_ENV=production PORT=8080 node server.js"]
