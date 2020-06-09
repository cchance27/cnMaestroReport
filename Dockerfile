#Specify a base image
FROM node:alpine as builder

WORKDIR /app

COPY ["./package.json", "./package-lock.json", "/app/"]
RUN npm ci
COPY "./" "/app/"

RUN npm run build:dist
RUN npm prune --production

# ===============
FROM node:alpine as runtime

WORKDIR /app
ENV NODE_ENV=production

## Copy the necessary files form builder
COPY --from=builder "/app/dist/" "/app/dist/"
COPY --from=builder "/app/node_modules/" "/app/node_modules/"
COPY --from=builder "/app/package.json" "/app/package.json"

CMD ["npm", "run", "start:dist"]