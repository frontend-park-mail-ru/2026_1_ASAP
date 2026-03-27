FROM node:20-alpine

WORKDIR /app
COPY package*.json ./

RUN npm ci --ignore-scripts
COPY . .

RUN npm run precompile

RUN npm run build

EXPOSE 3000
CMD ["node", "server/server.js"]
