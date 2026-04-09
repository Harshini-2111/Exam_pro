FROM node:18

WORKDIR /app

COPY backend/ .

RUN npm install

EXPOSE 8080

CMD ["node", "server.js"]