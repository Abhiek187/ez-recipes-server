# Fetch the latest LTS version of node
FROM node:18-alpine

# Create server directory
WORKDIR /usr/src/server

# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./

RUN npm install

# Bundle app source
COPY . .

# Run the node server on port 5000 and open the connection
EXPOSE $PORT
CMD [ "npm", "start" ]
