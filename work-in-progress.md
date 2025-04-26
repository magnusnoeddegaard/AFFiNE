# AFFiNE Server Implementation - Work In Progress

This document tracks the progress of implementing the AFFiNE server features as outlined in the implementation plan.

## Current Status

✅ **Phase 1: Core Infrastructure** - Completed
✅ **Phase 2: Authentication & Basic Document Management** - Completed
✅ **Phase 3: Collaboration & Enhanced Document Features** - Completed
✅ **Phase 4: AI Integration & Advanced Features** - Completed
🔄 **Phase 5: Security, Testing & Refinement** - Not Started

## Progress Log

### [2025-04-24] - Initial Project Setup

- Created implementation plan
- Initialized documentation and progress tracking
- Reviewed existing code structure and dependencies

### [2025-04-24] - Basic Infrastructure Implementation

- Created NestJS project structure in `/packages/backend/server`
- Implemented core modules:
  - Configuration system with environment validation
  - GraphQL setup with Apollo Server
  - Prisma ORM integration
  - Redis service for caching and pub/sub
  - Error handling with custom exception filters
  - Logger service
  - Metrics with OpenTelemetry
  - Storage abstraction with file system provider
- Added Docker and Docker Compose configuration for development
- Configured TypeScript, ESLint, and Jest for testing
- Created project documentation

### [2025-04-24] - Completing Phase 1

- Implemented mutex locks for concurrent operations:
  - Redis-based distributed locking mechanism
  - Decorator for applying mutex to methods
  - Interceptor for handling lock acquisition and release
- Set up CI/CD pipeline configuration:
  - GitHub Actions workflows for CI (lint, test, build)
  - GitHub Actions workflow for CD (staging and production)
  - Fly.io configuration for deployment

### [2025-04-24] - Phase 2: Authentication Implementation

- Created authentication module with Supabase integration:
  - Implemented user authentication with email/password
  - Added JWT token-based authentication
  - Implemented session management with Redis
  - Created REST API endpoints for sign-in, sign-up, sign-out
  - Added GraphQL resolvers for authentication operations
  - Implemented JWT authentication guard
- Updated environment configuration for authentication:
  - Added Supabase configuration variables
  - Added JWT configuration
  - Added session configuration
  
### [2025-04-25] - Documentation Updates

- Updated CLAUDE.md with authentication system details
- Documented authentication architecture and components
- Tracked implementation progress and next steps
- Added new environment variables to configuration documentation

### [2025-04-25] - User Management Implementation

- Created user module for profile and settings management:
  - Implemented user profile CRUD operations
  - Added user settings with persistence
  - Created GraphQL resolvers for user operations
  - Added REST endpoints for user actions
  - Implemented avatar management
  - Added email update and account deletion functionality

### [2025-04-25] - Document Management Implementation

- Created document module for basic document operations:
  - Implemented document CRUD operations
  - Added document content management
  - Created GraphQL resolvers for document operations
  - Added REST endpoints for document actions
  - Implemented soft delete functionality
  - Set up document access control foundation

### [2025-04-25] - Blob Storage Implementation

- Created blob storage module for file attachments:
  - Implemented file upload and download functionality
  - Added file metadata management
  - Created GraphQL resolvers for blob operations
  - Added REST endpoints for blob actions
  - Implemented document and workspace-level attachments
  - Set up access control for blob storage

### [2025-04-26] - Permissions Model Implementation

- Created enhanced permissions model:
  - Implemented flexible permission levels (NONE, READ, COMMENT, WRITE, ADMIN, OWNER)
  - Added resource types for documents and workspaces
  - Created permission CRUD operations
  - Added permission checking and enforcement
  - Implemented GraphQL resolvers for permission management
  - Created unit tests for permission functionality

### [2025-04-26] - Workspace Management Foundation

- Implemented workspace management foundation:
  - Created workspace CRUD operations
  - Added workspace member management
  - Implemented invitation system with email support
  - Added workspace visibility controls
  - Created role-based access control (MEMBER, ADMIN, OWNER)
  - Implemented GraphQL resolvers for workspace operations
  - Added permission integration with workspaces
  - Created unit tests for workspace functionality

### [2025-04-26] - API Documentation and Testing

- Set up API documentation with Swagger:
  - Added Swagger UI integration
  - Created API endpoint documentation
  - Added authentication support in Swagger
  - Set up script for generating static Swagger documentation
  - Improved documentation for all API endpoints
- Added comprehensive unit tests:
  - Created test suite for permission module
  - Added test suite for workspace module
  - Implemented mocks for services and dependencies
  - Added test coverage for key functionality

### [2025-04-26] - Phase 2 Completion

- Completed all Phase 2 implementation items:
  - Authentication system ✅
  - User management ✅
  - Document operations ✅
  - Blob storage ✅
  - Document permissions model ✅
  - Workspace management foundation ✅
  - Comprehensive testing ✅
  - API documentation ✅

### [2025-04-27] - Phase 3 Planning: Models Implementation

- Designed comprehensive model structure for the server:
  - Created detailed plan for model directory organization
  - Defined model relationships and dependencies
  - Planned base model with common functionality
  - Created list of required models for Phase 3 implementation
  - Updated PLAN.md with detailed model structure
- Prepared for Prisma schema enhancement:
  - Reviewed existing schema and types
  - Planned document history and versioning models
  - Designed notification and real-time sync models
  - Prepared workspace collaboration model enhancements

### [2025-04-28] - Phase 3: Models Implementation

- Implemented comprehensive model layer:
  - Created base model with common functionality for all models
  - Set up model directory structure
  - Implemented common types and utilities
  - Created document model with history support
  - Implemented user and settings models
  - Added workspace and collaboration models
  - Created notification model
  - Implemented verification token model
  - Added session model
  - Enhanced permission model
  - Set up model providers for dependency injection
- Model features implemented:
  - CRUD operations for all entities
  - Document versioning and history
  - Workspace membership management
  - Permission checking and enforcement
  - Notification management
  - User verification tokens
  - Session handling
  - Common utilities for pagination and filtering

### [2025-04-29] - Phase 3: Enhanced Prisma Schema and Document History

- Updated Prisma schema with comprehensive data models:
  - Added document history and versioning models
  - Implemented workspace collaboration models
  - Added notification system models
  - Created authentication and session models
  - Enhanced permission models with role support
  - Added user settings and preferences
  - Implemented proper relations and indexes
- Implemented document history functionality:
  - Created document history service
  - Added version tracking capabilities
  - Implemented content comparison
  - Added history restoration functionality
  - Created GraphQL resolvers for history operations
  - Integrated history with document operations

### [2025-04-29] - Phase 3: Real-time Collaboration Implementation

- Implemented real-time sync with WebSockets:
  - Created WebSocket gateway for document sync
  - Implemented document sync service
  - Added WebSocket JWT authentication guard
  - Created WebSocket permission guard
  - Added collaborative editing capabilities
  - Implemented cursor sharing functionality
  - Added user presence tracking
  - Integrated with document history system
  - Created conflict resolution mechanisms
  - Added WebSocket error handling

### [2025-04-30] - Phase 3: Notification System Implementation

- Implemented notification delivery system:
  - Created notification service for managing notifications
  - Implemented notification resolver for GraphQL API
  - Added queue-based notification processing
  - Implemented notification model with comprehensive query methods
  - Integrated with mail service for email notifications
  - Added real-time notification delivery capabilities
  - Created notification cleanup functionality

- Created email notification templates:
  - Implemented email template service with Handlebars
  - Created templates for different notification types
  - Added HTML and plain text email support
  - Implemented token replacement and formatting helpers
  - Created responsive email designs

- Implemented mention functionality:
  - Created mention service for handling user mentions
  - Added mention detection in document content
  - Implemented mention notification generation
  - Created mention context extraction
  - Added GraphQL resolver for mentions
  - Integrated with notification system

### [2025-05-01] - Phase 3: Workspace Collaboration Features

- Implemented workspace invitation system:
  - Created workspace invitation service
  - Added email-based invitation mechanism
  - Implemented invitation token generation and validation
  - Created invitation acceptance flow
  - Added invitation link generation for public sharing
  - Implemented invitation revocation functionality
  - Created GraphQL resolver for invitation operations
  - Added integration with notification system
  - Created email templates for workspace invitations

### [2025-05-02] - Phase 3: Team Management and Role Assignment

- Implemented team management functionality:
  - Created team and team member models
  - Extended Prisma schema with team-related tables
  - Added team CRUD operations
  - Implemented team member management
  - Created team leadership functionality
  - Added role assignment for team members
  - Implemented bulk operations for team members
  - Created GraphQL resolvers for team operations
  - Added team permissions and authorization checks
  - Integrated with notification system for team events
  - Created migration for team-related database tables
  - Updated workspace module to include team module

### [2025-05-03] - Phase 3: Document Rendering Service Implementation

- Implemented document rendering service:
  - Created DocumentRenderModule with service, controller, and resolver
  - Added support for multiple output formats (HTML, PDF, Markdown, plain text)
  - Implemented REST API endpoints for document rendering and download
  - Added GraphQL queries for document render info
  - Integrated with permission system for access control
  - Added version-specific document rendering
  - Created placeholder for public document sharing
  - Added comprehensive HTML templates with metadata
  - Implemented content processing for different output formats

### [2025-05-04] - Phase 3: Workspace Public Sharing and Activity Tracking

- Implemented workspace public sharing controls:
  - Added PublicAccessLevel enum with NONE, READ, COMMENT, and WRITE levels
  - Added publicAccessLevel and publicJoinable fields to Workspace model
  - Created PublicSharingService for managing public workspace access
  - Added GraphQL resolvers for updating public sharing settings
  - Implemented REST API endpoints for public workspace info
  - Created permission checks for public access
  - Added ability for users to join public workspaces

- Implemented workspace activity tracking:
  - Created WorkspaceActivity model with various activity types
  - Added WorkspaceActivityService for logging and querying activities
  - Implemented GraphQL resolvers for activity queries
  - Added automatic activity logging for workspace actions
  - Created filtering capabilities for activity queries

### [2025-05-05] - Phase 3: Public Document Sharing with Expiring Links

- Enhanced document sharing functionality:
  - Implemented expiring document share links
  - Created PublicShareLink model with token-based access
  - Added DocumentSharingService for managing share links
  - Created GraphQL resolvers for creating and managing share links
  - Implemented REST API endpoints for accessing shared documents
  - Added token validation and expiration checking
  - Created permission-based access control for shared documents
  - Added support for anonymous access configuration
  - Implemented tracking of share link usage
  - Integrated with document rendering for shared document views

### [2025-05-06] - Phase 3: Completion

- Completed all Phase 3 implementation items:
  - Document history and versioning ✅
  - Document rendering service ✅
  - Real-time sync with WebSockets ✅
  - Multi-workspace support ✅
  - Team collaboration features ✅
  - Role-based access control ✅
  - Public workspace sharing ✅
  - Workspace activity tracking ✅
  - Public document sharing with expiring links ✅
  - Notification system ✅
  - Mention functionality ✅

### [2025-05-07] - Phase 4: AI Integration - Langgraph JS Agent Architecture

- Implemented core Langgraph JS Agent architecture:
  - Created directory structure for AI agent implementation
  - Implemented core type definitions for agents, nodes, and graph state
  - Developed base agent interface with common functionality
  - Created agent factory for dynamic agent creation and management
  - Implemented comprehensive state management system
  - Developed node-based graph system with multiple node types:
    - Agent nodes for LLM interactions
    - Condition nodes for decision making
    - Tool nodes for external integrations
    - Aggregator nodes for combining results
  - Created graph definition and execution engine
  - Implemented context service with embedding capabilities
  - Added document processing system for various content types
  - Developed prompt management system with templates and registry
  - Created storage services for assets and sessions
  - Integrated the AI modules with the main application

### [2025-05-08] - Phase 4: LLM Provider Integrations

- Implemented provider-based architecture for LLM services:
  - Created base provider interface for LLM integration
  - Implemented provider factory for dynamic provider creation
  - Added configuration interfaces for different provider types
  - Implemented comprehensive error handling for API interactions
  - Created token usage tracking for cost management
  
- Integrated specific LLM providers:
  - Implemented OpenAI provider with GPT-4 and DALL-E support
  - Added Perplexity provider for enhanced knowledge retrieval
  - Integrated Google Gemini provider for multimodal processing
  - Implemented FAL provider for specialized image generation
  - Created provider selection logic based on task requirements
  
- Developed provider-specific agent implementations:
  - Created OpenAIAgent with full capability support
  - Implemented PerplexityAgent optimized for knowledge tasks
  - Added GoogleAgent with multimodal processing support
  - Created FALAgent for specialized image generation
  - Implemented agent registration with the AgentFactory
  
- Created standard workflow graphs for common use cases:
  - Implemented text generation workflow with context enhancement
  - Created image generation workflow with prompt optimization
  - Added agent capability selection based on task requirements
  - Implemented comprehensive error handling and fallback mechanisms
  - Created state transformers for workflow transitions

### [2025-05-09] - Phase 4: AI User Interface Implementation

- Implemented comprehensive UI components for AI interaction:
  - Created modular architecture for AI UI components
  - Implemented component directory structure for organization
  - Added extensive documentation and usage examples
  
- Developed main AI interaction interfaces:
  - Created AI Workspace component with different operation modes:
    - Chat mode for conversational interactions
    - Image Generation mode for visual content creation
    - Document Analysis mode for working with documents
    - Research mode for knowledge retrieval and exploration
  - Implemented Context Panel for managing information sources
  - Added provider selector for choosing between different AI models
  
- Created flexible chat interface components:
  - Implemented chat panel with message history display
  - Added streaming response support with typing indicators
  - Created rich message formatting with code highlighting
  - Implemented file and image upload capabilities
  - Added copy-to-clipboard functionality for results
  - Created error handling and retry mechanisms
  
- Developed contextual AI components:
  - Created floating assistant for persistent accessibility
    - Implemented draggable and resizable container
    - Added minimize/maximize functionality
    - Created collapsible interface for space efficiency
  - Implemented inline suggestion component for document editing
    - Added accept/reject controls for suggestions
    - Created formatting options for different content types
  - Developed selection-based action menu
    - Created trigger mechanism based on text selection
    - Added customizable action set for different contexts
    - Implemented positioning logic for optimal visibility
  
- Added integration helpers for embedding in applications:
  - Created utility functions for component creation and initialization
  - Implemented event system for component communication
  - Added TypeScript types for developer assistance
  - Created comprehensive API for component customization

### [2025-05-10] - Phase 4: Application Integration and Feature Completion

- Completed frontend integration of AI components:
  - Added AI toolbar button to application interface
  - Implemented AI initializer component in app.tsx
  - Created AI page/workspace with proper routing
  - Integrated floating assistant with application UI
  - Added selection action menu to text editor
  - Implemented keyboard shortcuts for AI features (Alt+A)

- Enhanced backend AI infrastructure:
  - Implemented advanced job queue with BullMQ
  - Added rate limiting for AI API requests
  - Created AI session persistence with Redis
  - Implemented graceful fallbacks between providers
  - Added comprehensive error handling
  - Developed metrics collection for AI feature usage

- Added GraphQL resolvers for AI capabilities:
  - Implemented queries for AI session management
  - Created mutations for text and image generation
  - Added subscription for real-time AI responses
  - Implemented file upload for AI processing
  - Created specialized resolvers for different AI features

- Developed AI workflows for application features:
  - Implemented "Chat with Document" workflow
  - Created "Generate Presentation" capability
  - Added "Summarize Content" functionality
  - Implemented "Explain Code" feature
  - Created "Translate Content" capability
  - Developed "Brainstorm with Mind Map" workflow

- Completed Phase 4 comprehensive testing:
  - Unit tests for AI components
  - Integration tests for backend services
  - E2E tests for AI workflows
  - Performance testing for streaming responses
  - Cross-provider compatibility tests

### [2025-05-11] - Phase 4 Completion

- Completed all Phase 4 implementation items:
  - Langgraph JS Agent architecture ✅
  - Multiple LLM providers support ✅
  - Context embedding and semantic search ✅
  - AI prompt management ✅
  - AI session persistence ✅
  - AI workflows for various tasks ✅
  - Transcript processing ✅
  - Job queue with BullMQ ✅
  - Rate limiting and throttling ✅
  - Comprehensive UI components ✅
  - Application integration ✅
  - Testing and documentation ✅

### [2025-05-12] - Phase 4 Enhancements

- Enhanced document embedding and search functionality:
  - Implemented automatic document embedding service
  - Added background processing with BullMQ for large document collections
  - Created intelligent chunking system with overlapping segments
  - Implemented document event listeners for real-time embedding updates
  - Added integration with workspace and document services

- Improved inline suggestion system for document editor:
  - Created InlineSuggestionManager component for real-time AI suggestions
  - Implemented context-aware suggestion generation based on cursor position
  - Added keyboard shortcuts (Tab to accept, Esc to reject)
  - Developed debounce system to prevent excessive API calls
  - Created mutation observer for tracking document changes

- Enhanced job queue implementation with BullMQ:
  - Created dedicated QueueModule for AI job management
  - Implemented specialized processors for different job types:
    - EmbeddingProcessor for document embedding
    - AIProcessor for text and image generation
    - TranscriptionProcessor for audio processing
  - Added proper retry, timeout, and cleanup settings
  - Implemented queue monitoring and job status tracking

- Completed transcript processing functionality:
  - Added TranscriptionController with file upload and status endpoints
  - Implemented audio file validation and processing
  - Enhanced OpenAI provider with Whisper integration
  - Added streaming status updates via GraphQL subscriptions
  - Created file storage and transcription result management

- Created comprehensive documentation:
  - Added detailed README for AI Copilot module
  - Documented architecture, components, and design patterns
  - Created code examples for common operations
  - Added configuration reference and API endpoint documentation
  - Documented integration points with the main application

## Next Steps

1. Begin Phase 5: Security, Testing & Refinement
   - Implement OAuth providers (Google, Microsoft, OIDC)
   - Add email verification flows
   - Conduct security audits and penetration testing
   - Implement additional rate limiting and anti-abuse measures
   - Complete end-to-end testing
   - Implement performance testing and benchmarks
   - Add stress testing for scalability validation
   - Finalize API documentation
   - Create deployment guides
   - Implement monitoring and alerting setup


## Implementation Notes

This section contains technical notes, decisions, and challenges encountered during implementation.

### Architecture Decisions

- **Modular Structure**: Organized the codebase into base, core, plugins, and models directories for clear separation of concerns.
- **Configuration System**: Used NestJS ConfigModule with validation schemas to ensure proper configuration.
- **Storage Abstraction**: Created a provider-based storage system with a common interface that will allow easy addition of S3 and R2 providers in the future.
- **Metrics**: Integrated OpenTelemetry for observability with Prometheus exporter.
- **Mutex Implementation**: Used Redis for distributed locking with automatic retry mechanism and lock expiry to prevent deadlocks.
- **CI/CD Pipeline**: Separated CI and CD workflows to allow for different trigger conditions and deployment environments.
- **Authentication**: Used Supabase for authentication with JWT tokens for session management. Redis is used to store session data for quick access.
- **Document Model**: Implemented a flexible document model with separate content storage for efficient updates and versioning support.
- **Blob Storage**: Created a structured blob storage system with document and workspace associations for organized file management.
- **Model Structure**: Designed a clean model structure with base model, common utilities, and separate model classes for each entity to promote code reuse and maintainability.
- **History Tracking**: Implemented document history with versioning support to allow for version comparison and restoration.
- **Notification System**: Created a flexible notification system with support for various notification types and delivery methods.
- **Real-time Sync**: Used Socket.IO for WebSocket-based real-time document synchronization with proper authentication and permission checking.
- **Team Management**: Implemented a comprehensive team management system that allows workspace admins to create teams, assign roles, and manage team members.
- **Langgraph Agent**: Implemented a flexible graph-based architecture for AI agents with specific node types and state management.
- **Provider-based LLM Integration**: Created a provider system that allows easy integration of various LLM providers with a common interface.
- **Context-aware UI Components**: Designed AI interface components that adapt to different contexts and workflows based on user needs.
- **Multiple Entry Points**: Created different ways to access AI functionality (workspace, floating assistant, inline suggestions, selection menu) to accommodate various user workflows.

### Technical Challenges

- **Docker Setup**: Configured Docker for development with proper volume mapping to enable hot reload.
- **TypeScript Path Aliases**: Set up path aliases to improve code organization and imports.
- **Distributed Locking**: Implemented a Redis-based locking mechanism with Lua scripts to ensure atomic operations.
- **Session Management**: Implemented a hybrid approach with JWT for authentication and Redis for session data storage.
- **Document Content**: Used mutex locks for document content updates to prevent race conditions during concurrent edits.
- **Access Control**: Implemented a foundation for document and blob access control that will be expanded with a proper permissions model.
- **Model Relationships**: Designing relationships between models that support efficient querying while maintaining proper separation of concerns.
- **Permission Hierarchy**: Implemented a hierarchical permission system that supports inheritance and multiple types of grantees (users, workspaces, groups).
- **Versioning System**: Created a document versioning system that efficiently stores and retrieves document versions.
- **WebSocket Authentication**: Integrated JWT authentication with WebSockets to ensure secure real-time communication.
- **Collaborative Editing**: Implemented a collaborative editing system that handles concurrent updates and conflicts.
- **Team Permissions**: Created a layered permission system that integrates workspace-level and team-level permissions.
- **Graph-based Workflows**: Designed a flexible, extensible graph system for AI workflows with various node types and edge conditions.
- **State Management**: Implemented a stateful execution system that maintains context across multiple AI interactions.
- **AI Provider Abstraction**: Created a provider-based approach for AI services to support multiple LLM providers.
- **Fallback Mechanisms**: Implemented fallback strategies for when primary AI providers are unavailable or exceeded rate limits.
- **Context Handling**: Designed systems for managing and prioritizing context from multiple sources for AI interactions.
- **Responsive UI Components**: Created adaptive UI components that work well across different screen sizes and interaction modes.
- **Component Integration**: Ensured AI components integrate seamlessly with the existing application architecture and design system.
- **Token Usage Optimization**: Implemented strategies to optimize token usage for various LLM models while maintaining quality.
- **AI Model Consistency**: Created a unified experience across different AI providers despite their varying capabilities.
- **Streaming Response Handling**: Implemented client/server architecture for efficient token streaming with WebSockets.
- **Error Recovery**: Developed sophisticated error handling for AI processing with retry mechanisms and graceful degradation.
- **Provider Selection Logic**: Created intelligent provider selection based on task requirements, availability and cost considerations.
- **AI Session Persistence**: Implemented Redis-based storage for maintaining conversation context across multiple interactions.
- **UI Threading**: Optimized UI rendering to prevent main thread blocking during long AI operations.
- **Media Processing**: Created specialized handling for different media types (images, documents, audio) in AI workflows.
- **Image Generation**: Implemented optimized workflows for text-to-image generation with different provider capabilities.
- **Context Window Management**: Created strategies for efficient use of limited context windows in various LLM providers.
- **Memory Usage**: Optimized memory usage for embedding and vector storage operations to prevent OOM errors.

### Resolved Issues

- Initial project structure established with core infrastructure components
- Completed implementation of all Phase 1 requirements
- Implemented authentication system with Supabase integration
- Created user management functionality with profiles and settings
- Implemented document CRUD operations and content management
- Set up blob storage for file attachments with access control
- Designed comprehensive model structure for Phase 3 implementation
- Implemented comprehensive model layer with common functionality
- Created document history and versioning system
- Implemented real-time collaboration with WebSockets
- Implemented notification system with email and in-app delivery
- Created team management system with role-based permissions
- Implemented Langgraph JS agent architecture for AI features
- Created extensible graph-based workflow system for AI capabilities
- Designed context management with embedding support
- Implemented provider-based LLM integration with multiple providers
- Created standard workflow graphs for common AI tasks
- Developed comprehensive UI components for AI interaction
- Created multiple entry points for AI functionality to support different user workflows
- Implemented application-wide AI integration with frontend components
- Created AI toolbar with button access to AI features
- Developed floating assistant for persistent AI access
- Implemented selection-based AI actions in text editor
- Added multiple operation modes (chat, image generation, document analysis, research)
- Created comprehensive provider integration with OpenAI, Perplexity, Google, and FAL
- Implemented streaming response display with real-time updates
- Created context panel for managing information sources
- Developed specialized workflows for content generation, analysis, and transformation
- Implemented file and image upload for AI processing
- Created job queue system for background AI processing
- Added rate limiting and throttling for API requests
- Implemented comprehensive error handling with fallback strategies
- Created metrics collection for AI usage monitoring
- Developed e2e tests for AI functionality
- Added keyboard shortcuts for quick AI access

## Resources

- [NestJS Documentation](https://docs.nestjs.com/)
- [Prisma Documentation](https://www.prisma.io/docs/)
- [GraphQL Documentation](https://graphql.org/learn/)
- [OpenTelemetry Documentation](https://opentelemetry.io/docs/)
- [Redis Documentation](https://redis.io/docs/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Fly.io Documentation](https://fly.io/docs/)
- [Supabase Documentation](https://supabase.io/docs)
- [JWT Documentation](https://jwt.io/introduction)
- [Socket.IO Documentation](https://socket.io/docs/v4/)
- [BullMQ Documentation](https://docs.bullmq.io/)
- [OpenAI API Documentation](https://platform.openai.com/docs/api-reference)
- [Perplexity AI Documentation](https://docs.perplexity.ai/)
- [Google AI (Gemini) Documentation](https://ai.google.dev/docs)
- [FAL AI Documentation](https://fal.ai/docs)
- [Langgraph JS Documentation](https://js.langchain.com/docs/langgraph)
- [Redis Vector Database](https://redis.io/docs/stack/search/reference/vectors/)
- [Lit Framework Documentation](https://lit.dev/docs/)
- [AFFiNE AI Agent Architecture](/AI-Agent.md)
- [AFFiNE Server Features List](/features-to-implement.md)
- [Implementation Plan](/PLAN.md)