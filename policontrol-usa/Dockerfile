FROM node:18-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --production
COPY client/package.json client/
RUN cd client && npm install
COPY client/ client/
RUN cd client && npm run build
COPY server/ server/
RUN mkdir -p server/data server/uploads
EXPOSE 3000
CMD ["node", "server/index.js"]
