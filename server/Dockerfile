FROM node:24-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN mkdir -p logs

EXPOSE 4000

CMD [ "npm", "run", "dev" ]