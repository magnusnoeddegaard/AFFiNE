# AFFiNE AI Copilot

This module provides AI capabilities for the AFFiNE platform through a flexible, graph-based architecture using Langgraph JS.

## Architecture

The AI system is built around a Langgraph-based architecture with the following components:

- **Agents**: Specialized AI interfaces that handle different capabilities like text generation, image creation, etc.
- **Providers**: Abstraction for different LLM APIs (OpenAI, Perplexity, Google, FAL)
- **Graphs**: Workflow definitions that orchestrate multi-step AI processes
- **Context**: System for managing document context and semantic search
- **Sessions**: Persistent conversations with state management

## Key Components

### Agent System

The agent system uses a capability-based approach with a common interface:

```typescript
interface LanggraphAgent<Config = any> {
  readonly name: string;
  readonly capabilities: AgentCapability[];
  readonly tools: Tool[];
  
  invoke(state: State): Promise<AgentResponse>;
  validateInput(state: State): boolean;
  getNextNode(response: AgentResponse): string | null;
}
```

Supported capabilities include:
- TextGeneration - Generate text from prompts
- Embedding - Create vector embeddings
- ImageGeneration - Generate images from text
- ImageAnalysis - Analyze images and extract content
- ToolUse - Use external tools to accomplish tasks

### Provider System

The provider system abstracts different LLM APIs behind a common interface:

```typescript
interface LLMProvider {
  readonly id: string;
  readonly name: string;
  readonly capabilities: string[];
  
  generateText(prompt: string, options?: any): Promise<string>;
  generateTextStream(prompt: string, options?: any): Promise<ReadableStream<string>>;
  embedText(text: string, model?: string): Promise<number[]>;
  generateImage(prompt: string, options?: any): Promise<ImageGenerationResult>;
  analyzeImage(imageUrl: string, prompt: string, options?: any): Promise<string>;
  transcribeAudio?(audioFile: Buffer | Readable, options?: any): Promise<TranscriptionResult>;
}
```

Supported providers:
- OpenAI (Default) - Full capabilities with GPT-4o, DALL-E, Whisper
- Perplexity - Knowledge-focused with web search capabilities
- Google - Multimodal capabilities with Gemini
- FAL - Specialized image generation

### Graph System

The graph system defines workflows as connected nodes with state transformations:

```typescript
interface GraphDefinition {
  name: string;
  nodes: {
    [key: string]: {
      type: NodeType;
      config?: Record<string, any>;
    }
  };
  edges: {
    [source: string]: string | string[] | {
      [target: string]: (state: GraphState) => boolean
    }
  };
}
```

Node types include:
- AgentNode - Invoke an AI agent
- ToolNode - Execute a specific function
- ConditionNode - Control flow based on state
- AggregatorNode - Combine results from multiple paths

### Context System

The context system enables semantic search and document awareness:

```typescript
class ContextService {
  addToContext(state: GraphState, content: string | Document): Promise<GraphState>;
  searchContext(state: GraphState, query: string, options?: SearchOptions): Promise<SearchResult[]>;
  clearContext(state: GraphState): GraphState;
}
```

Features:
- Embedding-based search with cosine similarity
- Document chunking for better semantic retrieval
- Multiple content type support (text, JSON, etc.)
- Automatic embedding of workspace documents

### Queue System

The system uses BullMQ for background processing of AI tasks:

- **Embedding Queue**: Handles document embedding tasks
- **AI Tasks Queue**: Manages longer-running AI generations
- **Transcription Queue**: Processes audio transcription requests

## Main Features

### Text Generation

```typescript
// Using the AI service
const result = await aiService.sendMessage(sessionId, {
  role: 'user',
  content: 'Explain quantum computing'
});
```

### Streaming Text Generation

```typescript
// Stream for real-time UI updates
const stream = await aiService.sendMessageStreamed(
  sessionId,
  { role: 'user', content: 'Tell me a story' },
  {
    onChunk: (chunk) => {
      // Update UI with each chunk
      console.log(chunk.content);
    }
  }
);
```

### Image Generation

```typescript
// Generate an image
const result = await aiService.generateImage(
  sessionId,
  'A futuristic city with flying cars',
  { size: '1024x1024' }
);
```

### Document Context

```typescript
// Include document context
const result = await aiService.sendMessage(
  sessionId,
  { role: 'user', content: 'Summarize this document' },
  { contextIds: ['document-123'] }
);
```

### Audio Transcription

```typescript
// Transcribe audio file
const jobId = await aiService.transcribeAudio(
  sessionId,
  audioFile,
  { language: 'en' }
);

// Check status
const status = await aiService.getTranscriptionStatus(jobId);
```

## API Endpoints

### Sessions

- `POST /api/ai/sessions` - Create a new session
- `DELETE /api/ai/sessions/:id` - End a session

### Messages

- `POST /api/ai/sessions/:id/messages` - Send a message
- `POST /api/ai/sessions/:id/messages/stream` - Send a message with streaming response

### Images

- `POST /api/ai/sessions/:id/images` - Generate an image

### Transcription

- `POST /api/ai/transcription` - Transcribe audio file
- `GET /api/ai/transcription/:jobId` - Get transcription job status
- `GET /api/ai/transcription` - Get all user transcriptions

### Providers

- `GET /api/ai/providers` - Get available providers and models

## Configuration

Configuration is managed through environment variables:

```env
# Provider API keys
OPENAI_API_KEY=sk-...
PERPLEXITY_API_KEY=pplx-...
GOOGLE_API_KEY=...
FAL_API_KEY=...

# Redis configuration for queues
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_QUEUE_DB=2

# Embedding configuration
AI_EMBEDDING_CHUNK_SIZE=1500

# Rate limiting
AI_RATE_LIMIT_TTL=60
AI_RATE_LIMIT_LIMIT=60
```

## Integration with Frontend

The AI features are integrated with the frontend through several components:

1. **AI Toolbar Button** - Entry point in the application toolbar
2. **AI Workspace** - Complete AI interface with multiple modes
3. **Floating Assistant** - Persistent assistant that can be moved around
4. **Selection Menu** - Context menu for text selections
5. **Inline Suggestions** - Real-time text completion

## Development

### Adding a New Provider

To add a new LLM provider:

1. Create a new provider class that implements `LLMProvider`
2. Register it with the `ProviderFactory`
3. Update provider selection in `AIController`

### Adding a New Agent

To add a new specialized agent:

1. Create a new agent class that extends `BaseAgent`
2. Implement required capabilities
3. Register it with the `AgentFactory`

### Creating a New Graph

To define a new AI workflow:

1. Create a new graph definition class
2. Define nodes and edges
3. Create state transformers for transitions
4. Register with the graph executor