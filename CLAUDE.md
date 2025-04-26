# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Test Commands
- Dev: `yarn dev` - Start development server
- Build: `yarn build` - Build the project
- Lint: `yarn lint` or `yarn lint:fix` - Run ESLint and Prettier checks/fixes
- Type check: `yarn typecheck` - Run TypeScript type checking
- Tests: `yarn test` - Run all tests
- Single test: `yarn test <test-file-path>` - Run specific test
- E2E tests: `npx playwright test <test-file-path>` - Run specific E2E test
- Test UI: `yarn test:ui` - Run tests with UI
- Test coverage: `yarn test:coverage` - Run tests with coverage reporting

## Server-Specific Commands (packages/backend/server)
- Dev: `npm run start:dev` - Start server in development mode
- Build: `npm run build` - Build the server
- Lint: `npm run lint` - Run ESLint
- Tests: `npm run test` - Run server tests
- Prisma: `npm run prisma:generate` - Generate Prisma client
- Prisma: `npm run prisma:migrate:dev` - Create database migration
- Prisma: `npm run prisma:migrate:deploy` - Apply database migrations
- Docker: `docker-compose up -d` - Start with Docker Compose

## Code Style Guidelines
- TypeScript for all code (`.ts`, `.tsx`) with strict typing
- React with functional components and hooks
- Prettier: Single quotes, 2 space indentation, trailing commas (ES5)
- Imports: Use `simple-import-sort` rules, no imports from `dist` or `src`
- Error handling: Use `@typescript-eslint/no-floating-promises` and proper async/await
- Naming: Observable streams with `$` suffix (Signal, ReadonlySignal, LiveData)
- Prefer readonly types when possible
- Use SonarJS rules for code quality
- Use JSX runtime (no React imports for JSX)

## Server Architecture (packages/backend/server)
- NestJS framework with modular architecture
- Prisma ORM for database access
- GraphQL API with code-first approach
- Redis for caching, pub/sub, and distributed locks
- OpenTelemetry for observability
- Modular structure:
  - `/base`: Core infrastructure (config, database, caching, etc.)
  - `/core`: Domain-specific modules (auth, documents, workspaces, etc.)
  - `/plugins`: Optional features (AI, payments, etc.)
  - `/models`: Data models and repositories

## Key Server Components
- ConfigModule: Environment-based configuration with validation
- PrismaModule: Database connectivity with Prisma ORM
- RedisModule: Redis client for caching and pub/sub
- GraphQLModule: Apollo Server with code-first approach
- LoggerModule: Logging service with configurable transports
- MetricsModule: OpenTelemetry integration with Prometheus
- StorageModule: Provider-based storage abstraction
- MutexModule: Redis-based distributed locking
- AuthModule: Supabase authentication integration with JWT and session management
- UserModule: User profile and settings management
- DocumentModule: Document CRUD operations and content management
- BlobModule: File attachment storage and management

## Core Domain Modules

### Authentication System (`/core/auth`)
- Supabase integration for user registration and authentication
- Email/password authentication
- JWT token-based authentication with configurable expiration
- Session management with Redis for performance
- User profile stored in Prisma database
- REST and GraphQL endpoints for auth operations
- Middleware guard for protected routes and resolvers

### User Management (`/core/user`)
- User profile CRUD operations
- User settings with persistence
- Avatar management and storage
- Email update functionality
- Account deletion capabilities
- GraphQL resolvers and REST endpoints

### Document Management (`/core/doc`)
- Document CRUD operations
- Document content storage and retrieval
- Soft delete functionality
- Document filtering and querying
- Access control foundation
- Mutex locks for concurrent edits

### Blob Storage (`/core/storage/blob`)
- File upload and download functionality
- File metadata management
- Document and workspace attachment associations
- Access control for attachments
- Structured storage paths and namespacing
- Support for various file types (attachments, images, avatars)

### Permission System (`/core/permission`)
- Flexible permission levels (NONE, READ, COMMENT, WRITE, ADMIN, OWNER)
- Resource type support for documents and workspaces
- Permission checking and enforcement
- Permission inheritance model
- GraphQL resolvers for permission management
- Authorization middleware integration

### Workspace Management (`/core/workspace`)
- Workspace CRUD operations
- Workspace member management
- Role-based access control (MEMBER, ADMIN, OWNER)
- Invitation system with email support
- Workspace visibility controls (PRIVATE, RESTRICTED, PUBLIC)
- Permission integration with workspace roles
- GraphQL resolvers for workspace operations

## API Documentation
- Swagger UI integration at `/api-docs`
- REST API documentation with authentication support
- GraphQL schema documentation
- Type definitions and input validation
- Example requests and responses

## Implementation Progress
- Phase 1 (Core Infrastructure): Completed ✅
- Phase 2 (Authentication & Basic Document Management): Completed ✅
  - Authentication system: Implemented ✅
  - User management: Implemented ✅
  - Document operations: Implemented ✅
  - Blob storage: Implemented ✅
  - Permissions model: Implemented ✅
  - Workspace management: Implemented ✅
  - Testing and documentation: Implemented ✅

## CI/CD Pipeline
- GitHub Actions workflows for CI/CD
- Fly.io deployment configuration for staging and production
- Automatic build, test, and deployment