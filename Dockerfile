FROM node:18-slim

# Install Python3
RUN apt-get update && apt-get install -y python3 python3-pip && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Node Deps
COPY package.json ./
RUN npm install

# Install Python Deps
COPY agents/requirements.txt ./agents/
RUN pip3 install -r agents/requirements.txt --break-system-packages

# Copy Code
COPY . .

EXPOSE 8080
CMD ["node", "src/server.js"]
