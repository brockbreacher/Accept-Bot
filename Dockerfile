FROM node:lts-alpine
ENV NODE_ENV=production
RUN apk add --no-cache su-exec
WORKDIR /usr/src/app
COPY ["package.json", "package-lock.json*", "npm-shrinkwrap.json*", "./"]
RUN npm install --production --silent && mv node_modules ../
COPY . .
RUN mkdir -p acceptbot/roledata
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
VOLUME /usr/src/app/acceptbot/roledata
ENTRYPOINT ["/entrypoint.sh"]
CMD ["node", "index.js"]
