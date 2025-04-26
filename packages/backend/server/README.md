# AFFiNE Server

This is the backend server for AFFiNE, an all-in-one knowledge base that combines document editing, whiteboarding, and knowledge management.

## Features

- Built with NestJS and TypeScript
- GraphQL API with Apollo Server
- PostgreSQL database with Prisma ORM
- Redis for caching, pub/sub, and distributed locks
- OpenTelemetry for observability
- Multi-provider storage system
- Modular architecture
- CI/CD pipelines with GitHub Actions and Fly.io
- Mutex locks for concurrent operations

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 15+
- Redis 7+
- Docker and Docker Compose (optional)

### Installation

1. Copy the environment variables:

```bash
cp .env.example .env
```

2. Update the environment variables as needed.

3. Install dependencies:

```bash
npm install
```

4. Generate Prisma client:

```bash
npm run prisma:generate
```

5. Start the development server:

```bash
npm run start:dev
```

### Using Docker

1. Build and start the containers:

```bash
docker-compose up -d
```

2. The server will be available at http://localhost:3000.

## Development

### Project Structure

```
/src
├── app.module.ts              # Main application module
├── main.ts                    # Application entry point
├── base/                      # Core infrastructure
│   ├── config/                # Configuration system
│   ├── graphql/               # GraphQL setup
│   ├── prisma/                # Database connectivity
│   ├── redis/                 # Redis services
│   ├── storage/               # Storage abstractions
│   ├── error/                 # Error handling
│   ├── logger/                # Logging services
│   ├── metrics/               # Observability
│   └── mutex/                 # Distributed locking
├── core/                      # Core domain modules
├── plugins/                   # Optional features
└── models/                    # Data models
```

### Available Scripts

- `npm run build` - Build the application
- `npm run start` - Start the application
- `npm run start:dev` - Start the application in development mode
- `npm run start:debug` - Start the application in debug mode
- `npm run lint` - Lint the code
- `npm run test` - Run tests
- `npm run prisma:generate` - Generate Prisma client
- `npm run prisma:migrate:dev` - Create a new migration
- `npm run prisma:migrate:deploy` - Apply migrations
- `npm run prisma:studio` - Open Prisma Studio

## Testing

To run tests:

```bash
npm run test
```

For end-to-end tests:

```bash
npm run test:e2e
```

## CI/CD

This project uses GitHub Actions for continuous integration and deployment:

- **CI Workflow**: Runs on every push and pull request to validate code quality, run tests, and build the application.
- **CD Workflow**: Deploys to staging (canary branch) or production (main branch) environments on Fly.io.

### Deployment Configuration

- Staging environment: `fly.staging.toml`
- Production environment: `fly.toml`

## Distributed Locking

The mutex module provides distributed locking using Redis:

```typescript
// Example usage with decorator
@WithMutex('resource-key')
async updateResource(id: string, data: UpdateDto): Promise<Resource> {
  // This method will be executed with a distributed lock
  // to prevent concurrent modifications
  return this.resourceService.update(id, data);
}

// Example usage with service
async function processBatch(batchId: string) {
  return await mutexService.withLock(
    `batch:${batchId}`,
    async () => {
      // Critical section that requires exclusive access
      // ...
    },
    30000, // TTL in milliseconds
    100,   // Retry delay
    5      // Max retries
  );
}
```

## License

This project is licensed under the [MIT License](LICENSE).