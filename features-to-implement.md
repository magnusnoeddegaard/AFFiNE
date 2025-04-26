# AFFiNE Server Features

## Core System
- **NestJS Architecture** - Modular structure with dependency injection for maintainable services
- **GraphQL API** - Schema-based API for efficient data fetching with pagination support
- **Prisma ORM** - Type-safe database access with migration support
- **Redis Integration** - Caching and pub/sub messaging system
- **Observability** - OpenTelemetry for metrics, logging, and tracing

## Authentication & Security
- **User Authentication** - Email/password and token-based authentication using Supabase
- **OAuth Integration** - Support for Google, Microsoft, and custom OIDC providers
- **Email Verification** - User account verification flow
- **Password Management** - Secure password storage and reset functionality
- **Session Management** - Secure user sessions with expiration

## Document Management
- **Document Storage** - Create, read, update, delete operations for documents
- **Document History** - Version control and document history tracking
- **Document Rendering** - Server-side rendering for document export/viewing
- **Real-time Sync** - WebSocket-based real-time document synchronization
- **Blob Storage** - File and image attachment capabilities
- **Document Permissions** - Granular access control for documents

## Workspace & Collaboration
- **Workspace Management** - Multi-workspace support for organizing documents
- **Team Collaboration** - Invite, join, and manage team members
- **Permission System** - Role-based access control (owner, admin, member, viewer)
- **Mentions** - User mentions with notifications
- **Workspace Invitation** - Email-based invitation system
- **Workspace Sharing** - Public/private workspace settings

## AI Features
- **Copilot Integration** - AI assistant capabilities
- **Multiple LLM Providers** - Support for OpenAI, Perplexity, Google, and FAL
- **Context Embedding** - Semantic understanding of document content
- **AI Prompt Management** - Save and reuse AI prompts
- **AI Sessions** - Persistent AI chat sessions
- **AI Workflows** - Complex AI workflows like brainstorming and presentations
- **Transcript Processing** - Voice-to-text functionality for audio input

## Notification & Communication
- **Email Notifications** - Templated email notifications for various events
- **In-app Notifications** - Real-time notification system
- **Email Templates** - React-based HTML email templates
- **Scheduled Notifications** - Time-based notification delivery

## Infrastructure
- **Server Configuration** - Dynamic configuration system
- **Storage Providers** - Filesystem, S3, and R2 storage options
- **Job Queue** - Background processing with BullMQ
- **Cron Jobs** - Scheduled tasks for maintenance operations
- **Mutex Locks** - Distributed locking for concurrent operations
- **Throttling** - Rate limiting to prevent abuse

## Developer Experience
- **Testing Framework** - Comprehensive unit and E2E testing setup
- **Development Tools** - Hot reloading, debugging, and logging
- **Error Handling** - Structured error types with user-friendly messages