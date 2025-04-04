# Use Node.js 20
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package.json and yarn.lock
COPY package.json yarn.lock ./


# Install dependencies
RUN yarn install

# Copy all files
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Expose the application port
EXPOSE 3001

# Start the application
CMD ["yarn", "start:prod"]
