#Specify a base image
FROM node:alpine

#Specify a working directory
WORKDIR /usr/app

# copy only node_modules/the-repo-package into the image because .dockerignore
COPY ["./package.json", "./package-lock.json", "/usr/app/"]

RUN npm install --production

RUN npm build:dist

CMD [ "npm", "run", "start:dist" ]