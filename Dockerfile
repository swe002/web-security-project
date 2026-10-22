# Use lightweight official Node image based on Alpine
FROM node:18-alpine

# Install build dependencies (needed for compiling sqlite3 native binary on Alpine)
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    iputils-ping

# Create app directory
WORKDIR /usr/src/app

# Copy package configurations
COPY package*.json ./

# Install packages (forces clean state compilation of SQLite3 native bindings inside container)
RUN npm install --omit=dev

# Bundle app source files
COPY . .

# Expose running server port
EXPOSE 3000

# Execute server bootloader
CMD [ "npm", "start" ]
