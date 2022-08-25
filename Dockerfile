FROM node:14.0.0-stretch AS development

WORKDIR /usr/src/app
COPY package*.json ./

RUN npm update -g yarn npm
RUN npm install -g @nestjs/cli node-gyp node-pre-gyp
RUN yarn install
COPY . .
RUN npm run build

FROM node:14.0.0-stretch AS production

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

WORKDIR /usr/src/app
COPY package*.json ./

RUN npm update -g yarn npm
RUN npm install -g @nestjs/cli node-gyp node-pre-gyp
RUN yarn install --production

COPY . .
COPY --from=development /usr/src/app/dist ./dist

CMD ["node", "dist/main"]
