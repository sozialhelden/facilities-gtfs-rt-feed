FROM node:alpine as builder
WORKDIR /app

# install dependencies
RUN apk add --update git bash
ADD package.json /app
RUN npm install

# build
ADD . /app
RUN npm run build

# ---

FROM node:alpine
LABEL org.opencontainers.image.title="facilities-gtfs-rt-feed"
LABEL org.opencontainers.image.description="Generate a GTFS-Realtime feed with the status of Berlin & Brandenburg elevators."
LABEL org.opencontainers.image.authors="Jannis R <mail@jannisr.de>"
LABEL org.opencontainers.image.documentation="https://github.com/derhuerst/facilities-gtfs-rt-feed"
LABEL org.opencontainers.image.source="https://github.com/derhuerst/facilities-gtfs-rt-feed"
LABEL org.opencontainers.image.revision="1"
LABEL org.opencontainers.image.licenses="MIT"
WORKDIR /app

# install dependencies
ADD package.json /app
RUN npm install --production && npm cache clean --force

# add source code
ADD . /app
COPY --from=builder /app/lib/gtfs-rt-stationupdate-draft.pbf.cjs ./lib/

EXPOSE 3000

CMD ["node", "index.js"]
