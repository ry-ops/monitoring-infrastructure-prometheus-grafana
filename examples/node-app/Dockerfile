FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application
COPY server.js .

# Expose port
EXPOSE 8001

# Run application
CMD ["node", "server.js"]
