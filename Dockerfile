ARG CODE_VERSION=16.13.1-alpine
FROM node:${CODE_VERSION}
LABEL maintainer="Valeriu Stinca <ts@strat.zone>"
LABEL version="0.0.1-beta"
LABEL vendor="Strategic Zone"
LABEL release-date="2022-03-23"

WORKDIR /app
COPY ./ ./
RUN apk add make g++ ffmpeg python3 \
    && ln -sf python3 /usr/bin/python \
    && npm install

EXPOSE 36100 3333
CMD [ "npm", "start" ]
# ENTRYPOINT ["echo", "your command here!"]