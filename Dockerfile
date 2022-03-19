FROM node:16.13.1-alpine
RUN apk add  --no-cache make g++ ffmpeg python3 && ln -sf python3 /usr/bin/python
WORKDIR /application
COPY . .
RUN npm i
CMD [ "npm", "start" ]
