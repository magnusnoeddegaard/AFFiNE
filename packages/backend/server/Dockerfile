FROM node:18-alpine

WORKDIR /app

# Install dependencies
RUN apk add --no-cache python3 make g++ postgresql-client

# Copy package files
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* ./

# Install dependencies based on the preferred package manager
RUN \
  if [ -f yarn.lock ]; then yarn --frozen-lockfile; \
  elif [ -f package-lock.json ]; then npm ci; \
  elif [ -f pnpm-lock.yaml ]; then yarn global add pnpm && pnpm i --frozen-lockfile; \
  else npm i; \
  fi

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build the application
RUN npm run build

# Expose port
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production

# Start the application
CMD ["npm", "run", "start:prod"]