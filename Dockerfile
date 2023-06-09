###################################################
# This Dockerfile is used by the docker-compose.yml
# file to build the development container.
# Do not make any changes here unless you know what
# you are doing.
###################################################

FROM node:18-bullseye as dev
RUN apt-get update -y && apt-get upgrade -y && apt-get install -y openssl
WORKDIR /app
CMD ["sh", "./bin/docker-start"]
