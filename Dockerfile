FROM node:lts-alpine
ENV NODE_ENV=production
WORKDIR /usr/src/app
RUN mkdir -p roledata && chown -R node:node roledata
VOLUME /usr/src/app/roledata
COPY ["package.json", "package-lock.json*", "npm-shrinkwrap.json*", "./"]
RUN npm install --production --silent && mv node_modules ../
COPY . .
RUN chown -R node /usr/src/app
USER node
CMD ["node", "index.js"]
