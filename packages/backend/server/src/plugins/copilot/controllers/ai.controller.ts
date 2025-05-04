import { Controller, Get, Post, Body, Param, Query, Res, StreamableFile } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { Readable } from 'stream';

import { AgentFactory } from '../agents/agent-factory';
import { StateManager } from '../state/state-manager';
import { ContextService } from '../context/context-service';
import { AgentCapability } from '../types';
import { TextGenerationGraph } from '../workflows/text-generation-graph';
import { ImageGenerationGraph } from '../workflows/image-generation-graph';
import { OpenAIProvider } from '../providers/openai-provider';
import { PerplexityProvider } from '../providers/perplexity-provider';
import { GoogleProvider } from '../providers/google-provider';
import { FALProvider } from '../providers/fal-provider';

// DTOs for request/response
class CreateSessionDto {
  provider?: string;
  docId?: string;
  workspaceId?: string;
}

class SessionResponseDto {
  sessionId: string;
  provider: string;
  createdAt: string;
}

class MessageDto {
  message: string;
  attachments?: string[];
  contextIds?: string[];
  networkSearch?: boolean;
  reasoning?: boolean;
}

class ImageGenerationDto {
  prompt: string;
  provider?: string;
  width?: number;
  height?: number;
}

class ImageGenerationResponseDto {
  imageUrl: string;
  metadata?: Record<string, any>;
}

class InlineSuggestionDto {
  text: string;
  provider?: string;
}

class SuggestionResponseDto {
  suggestion: string;
  metadata?: Record<string, any>;
}

class SelectionActionDto {
  actionId: string;
  selection: string;
  provider?: string;
}

class SelectionActionResponseDto {
  result: string;
  metadata?: Record<string, any>;
}

class ContextSourceDto {
  id: string;
  type: string;
  title: string;
  content?: string;
  url?: string;
  preview?: string;
  active: boolean;
}

class AIActionDto {
  id: string;
  icon: string;
  title: string;
  description?: string;
}

/**
 * AI controller for REST API endpoints
 */
@ApiTags('AI')
@Controller('api/ai')
export class AIController {
  // In-memory sessions for demo purposes
  private sessions: Map<string, any> = new Map();
  
  constructor(
    private readonly agentFactory: AgentFactory,
    @Inject('NodeFactory') private readonly nodeFactory: any,
    private readonly stateManager: StateManager,
    private readonly contextService: ContextService,
    private readonly textGenerationGraph: TextGenerationGraph,
    private readonly imageGenerationGraph: ImageGenerationGraph
  ) {}

  /**
   * Create a new AI session
   */
  @Post('sessions')
  @ApiOperation({ summary: 'Create a new AI session' })
  @ApiResponse({ status: 201, description: 'Session created successfully' })
  async createSession(@Body() createSessionDto: CreateSessionDto): Promise<SessionResponseDto> {
    const provider = createSessionDto.provider || 'openai';
    
    // Generate a unique session ID
    const sessionId = `session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    // Create session object
    const session = {
      id: sessionId,
      provider,
      createdAt: new Date().toISOString(),
      messages: [],
      metadata: {
        docId: createSessionDto.docId,
        workspaceId: createSessionDto.workspaceId
      }
    };
    
    // Store session
    this.sessions.set(sessionId, session);
    
    return {
      sessionId,
      provider,
      createdAt: session.createdAt
    };
  }

  /**
   * Get session information
   */
  @Get('sessions/:sessionId')
  @ApiOperation({ summary: 'Get session information' })
  @ApiResponse({ status: 200, description: 'Session found' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async getSession(@Param('sessionId') sessionId: string): Promise<SessionResponseDto> {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      throw new Error('Session not found');
    }
    
    return {
      sessionId: session.id,
      provider: session.provider,
      createdAt: session.createdAt
    };
  }

  /**
   * Get session message history
   */
  @Get('sessions/:sessionId/messages')
  @ApiOperation({ summary: 'Get session message history' })
  @ApiResponse({ status: 200, description: 'History retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async getSessionHistory(@Param('sessionId') sessionId: string): Promise<any[]> {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      throw new Error('Session not found');
    }
    
    return session.messages || [];
  }

  /**
   * Send a message to the AI - with streaming support
   */
  @Post('chat/:sessionId')
  @ApiOperation({ summary: 'Send a message to the AI' })
  @ApiResponse({ status: 200, description: 'Message processed successfully' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async sendMessage(
    @Param('sessionId') sessionId: string,
    @Body() messageDto: MessageDto,
    @Res({ passthrough: true }) res: Response
  ) {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      throw new Error('Session not found');
    }
    
    // Create a user message
    const userMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      role: 'user',
      content: messageDto.message,
      createdAt: new Date().toISOString(),
      attachments: messageDto.attachments || []
    };
    
    // Add to session messages
    session.messages.push(userMessage);
    
    // Get the appropriate provider based on the session
    let provider;
    switch (session.provider) {
      case 'openai':
        provider = new OpenAIProvider({
          apiKey: process.env.OPENAI_API_KEY,
          model: 'gpt-4o'
        });
        break;
      case 'perplexity':
        provider = new PerplexityProvider({
          apiKey: process.env.PERPLEXITY_API_KEY,
          model: 'pplx-70b-online'
        });
        break;
      case 'google':
        provider = new GoogleProvider({
          apiKey: process.env.GOOGLE_API_KEY,
          model: 'gemini-1.5-pro'
        });
        break;
      case 'fal':
        provider = new FALProvider({
          apiKey: process.env.FAL_API_KEY
        });
        break;
      default:
        provider = new OpenAIProvider({
          apiKey: process.env.OPENAI_API_KEY,
          model: 'gpt-4o'
        });
    }
    
    // Create a stream for the response
    const stream = new Readable({
      read() {} // Required implementation
    });
    
    // Set response headers for streaming
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Transfer-Encoding', 'chunked');
    
    // Create a placeholder for the assistant response
    const assistantMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      role: 'assistant',
      content: '',
      createdAt: new Date().toISOString()
    };
    
    // Add to session messages
    session.messages.push(assistantMessage);
    
    // Process in background
    (async () => {
      try {
        // In a real implementation, we would use the provider to generate a response
        // For simulation, generate chunks of text
        const chunks = [
          'I am ',
          'processing ',
          'your ',
          'request. ',
          'This ',
          'is ',
          'a ',
          'simulated ',
          'streaming ',
          'response ',
          'from the ',
          session.provider,
          ' provider.'
        ];
        
        for (const chunk of chunks) {
          // Add chunk to response
          stream.push(chunk);
          // Update assistant message content
          assistantMessage.content += chunk;
          // Add small delay to simulate processing
          await new Promise(resolve => setTimeout(resolve, 200));
        }
        
        // Complete the stream
        stream.push(null);
      } catch (error) {
        console.error('Error processing message:', error);
        stream.push(`Error: ${error.message}`);
        stream.push(null);
      }
    })();
    
    // Return the stream
    return new StreamableFile(stream);
  }

  /**
   * Retry the last message with streaming
   */
  @Post('chat/:sessionId/retry')
  @ApiOperation({ summary: 'Retry the last message' })
  @ApiResponse({ status: 200, description: 'Message retried successfully' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async retryLastMessage(
    @Param('sessionId') sessionId: string,
    @Res({ passthrough: true }) res: Response
  ) {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      throw new Error('Session not found');
    }
    
    // Find the last assistant message
    const messages = session.messages || [];
    const lastAssistantIndex = messages.findLastIndex((msg: { role: string; content: string; createdAt: string }) => msg.role === 'assistant');
    
    if (lastAssistantIndex === -1) {
      throw new Error('No assistant message to retry');
    }
    
    // Reset the content
    messages[lastAssistantIndex].content = '';
    messages[lastAssistantIndex].createdAt = new Date().toISOString();
    
    // Create a stream for the response
    const stream = new Readable({
      read() {} // Required implementation
    });
    
    // Set response headers for streaming
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Transfer-Encoding', 'chunked');
    
    // Process in background
    (async () => {
      try {
        // In a real implementation, we would use the provider to generate a response
        // For simulation, generate chunks of text
        const chunks = [
          'This ',
          'is ',
          'a ',
          'retry ',
          'of ',
          'the ',
          'previous ',
          'message. ',
          'Using ',
          session.provider,
          ' provider.'
        ];
        
        for (const chunk of chunks) {
          // Add chunk to response
          stream.push(chunk);
          // Update assistant message content
          messages[lastAssistantIndex].content += chunk;
          // Add small delay to simulate processing
          await new Promise(resolve => setTimeout(resolve, 200));
        }
        
        // Complete the stream
        stream.push(null);
      } catch (error) {
        console.error('Error retrying message:', error);
        stream.push(`Error: ${error.message}`);
        stream.push(null);
      }
    })();
    
    // Return the stream
    return new StreamableFile(stream);
  }

  /**
   * Generate an image
   */
  @Post('image/:sessionId')
  @ApiOperation({ summary: 'Generate an image' })
  @ApiResponse({ status: 200, description: 'Image generated successfully' })
  async generateImage(
    @Param('sessionId') sessionId: string,
    @Body() imageDto: ImageGenerationDto
  ): Promise<ImageGenerationResponseDto> {
    // In a real implementation, we would use the provider to generate an image
    
    return {
      imageUrl: 'https://via.placeholder.com/1024',
      metadata: {
        provider: imageDto.provider || 'openai',
        prompt: imageDto.prompt,
        width: imageDto.width || 1024,
        height: imageDto.height || 1024
      }
    };
  }

  /**
   * Get context sources
   */
  @Get('context/sources')
  @ApiOperation({ summary: 'Get context sources' })
  @ApiResponse({ status: 200, description: 'Sources retrieved successfully' })
  async getContextSources(
    @Query('docId') docId?: string,
    @Query('workspaceId') workspaceId?: string
  ): Promise<ContextSourceDto[]> {
    // In a real implementation, we would retrieve context sources from the database
    
    // Return some example sources
    return [
      {
        id: 'doc-1',
        type: 'document',
        title: 'Project Overview',
        content: 'This is a project overview document.',
        active: true
      },
      {
        id: 'doc-2',
        type: 'document',
        title: 'Implementation Plan',
        content: 'This is an implementation plan document.',
        active: true
      },
      {
        id: 'img-1',
        type: 'image',
        title: 'Architecture Diagram',
        url: 'https://via.placeholder.com/300',
        active: false
      }
    ];
  }

  /**
   * Get inline suggestion
   */
  @Post('suggestions/inline')
  @ApiOperation({ summary: 'Get inline suggestion' })
  @ApiResponse({ status: 200, description: 'Suggestion generated successfully' })
  async getInlineSuggestion(
    @Body() suggestionDto: InlineSuggestionDto
  ): Promise<SuggestionResponseDto> {
    try {
      // Use the text generation graph to generate a suggestion
      const initialState = {
        messages: [
          {
            role: 'system' as const,
            content: 'You are a helpful assistant that provides inline suggestions to continue text.',
            createdAt: new Date().toISOString()
          },
          {
            role: 'user' as const,
            content: `Continue this text: ${suggestionDto.text}`,
            createdAt: new Date().toISOString()
          }
        ]
      };
      
      const result = await this.textGenerationGraph.run(initialState);
      
      // Extract the assistant's response
      const assistantMessage = result.messages.find(msg => msg.role === 'assistant');
      
      return {
        suggestion: assistantMessage?.content || 'No suggestion available',
        metadata: {
          provider: suggestionDto.provider || 'openai',
          inputLength: suggestionDto.text.length
        }
      };
    } catch (error) {
      console.error('Error getting inline suggestion:', error);
      throw new Error('Failed to get inline suggestion');
    }
  }

  /**
   * Process a selection action
   */
  @Post('actions/:actionId')
  @ApiOperation({ summary: 'Process a selection action' })
  @ApiResponse({ status: 200, description: 'Action processed successfully' })
  async processSelectionAction(
    @Param('actionId') actionId: string,
    @Body() actionDto: SelectionActionDto
  ): Promise<SelectionActionResponseDto> {
    try {
      // Build a system prompt based on the action
      let systemPrompt = 'You are a helpful assistant.';
      
      switch (actionId) {
        case 'explain':
          systemPrompt = 'You are a helpful assistant that explains concepts clearly and concisely.';
          break;
        case 'summarize':
          systemPrompt = 'You are a helpful assistant that summarizes text concisely while preserving the key points.';
          break;
        case 'translate':
          systemPrompt = 'You are a helpful assistant that translates text accurately. Translate to English unless otherwise specified.';
          break;
        case 'improve':
          systemPrompt = 'You are a helpful assistant that improves writing by making it more clear, concise, and engaging.';
          break;
        case 'code':
          systemPrompt = 'You are a helpful assistant that generates clean, efficient, and well-documented code.';
          break;
        case 'analyze':
          systemPrompt = 'You are a helpful assistant that analyzes text to identify key themes, patterns, and insights.';
          break;
      }
      
      // Use the text generation graph to process the action
      const initialState = {
        messages: [
          {
            role: 'system' as const,
            content: systemPrompt,
            createdAt: new Date().toISOString()
          },
          {
            role: 'user' as const,
            content: `${actionId}: ${actionDto.selection}`,
            createdAt: new Date().toISOString()
          }
        ]
      };
      
      const result = await this.textGenerationGraph.run(initialState);
      
      // Extract the assistant's response
      const assistantMessage = result.messages.find(msg => msg.role === 'assistant');
      
      return {
        result: assistantMessage?.content || 'No result available',
        metadata: {
          action: actionId,
          provider: actionDto.provider || 'openai',
          selectionLength: actionDto.selection.length
        }
      };
    } catch (error) {
      console.error('Error processing selection action:', error);
      throw new Error('Failed to process selection action');
    }
  }

  /**
   * Get available AI actions
   */
  @Get('actions')
  @ApiOperation({ summary: 'Get available AI actions' })
  @ApiResponse({ status: 200, description: 'Actions retrieved successfully' })
  async getAvailableActions(): Promise<AIActionDto[]> {
    // Return predefined list of actions
    return [
      { id: 'explain', icon: '🔍', title: 'Explain', description: 'Get an explanation' },
      { id: 'summarize', icon: '📝', title: 'Summarize', description: 'Get a summary' },
      { id: 'translate', icon: '🌐', title: 'Translate', description: 'Translate to another language' },
      { id: 'improve', icon: '✨', title: 'Improve', description: 'Improve the writing' },
      { id: 'code', icon: '💻', title: 'Generate Code', description: 'Generate code from description' },
      { id: 'analyze', icon: '📊', title: 'Analyze', description: 'Analyze the content' }
    ];
  }
}