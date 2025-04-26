import { BaseAgent, AgentConfig } from './base-agent';
import { OpenAIProvider } from '../providers/openai-provider';
import { AgentCapability, AgentResponse, GraphState, Message, Tool } from '../types';

/**
 * Configuration options for OpenAI agent
 */
export interface OpenAIAgentConfig extends AgentConfig {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  apiKey?: string;
  baseUrl?: string;
  streaming?: boolean;
  tools?: Tool[];
}

/**
 * OpenAI-based LLM agent
 */
export class OpenAIAgent extends BaseAgent<OpenAIAgentConfig> {
  private provider: OpenAIProvider;
  
  constructor(config: OpenAIAgentConfig) {
    super(
      'openai-agent',
      [
        AgentCapability.TextGeneration,
        AgentCapability.Embedding,
        AgentCapability.ImageGeneration,
        AgentCapability.ImageAnalysis,
        AgentCapability.ToolUse
      ],
      {
        // Default configuration
        model: 'gpt-4o',
        temperature: 0.7,
        maxTokens: 1000,
        ...config
      }
    );
    
    // Initialize the OpenAI provider
    this.provider = new OpenAIProvider({
      apiKey: config.apiKey,
      baseUrl: config.baseUrl,
      model: config.model,
      temperature: config.temperature,
      maxTokens: config.maxTokens,
      topP: config.topP,
      frequencyPenalty: config.frequencyPenalty,
      presencePenalty: config.presencePenalty,
      tools: config.tools?.map(tool => ({
        type: 'function',
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters
        }
      }))
    });
  }
  
  /**
   * Invoke the OpenAI agent to process the current state
   */
  async invoke(state: GraphState): Promise<AgentResponse> {
    // Validate input before processing
    if (!this.validateInput(state)) {
      return {
        output: 'Invalid input state',
        updatedState: {},
        error: new Error('Invalid input state')
      };
    }
    
    // Extract messages from state
    const messages = this.getMessages(state);
    
    try {
      // Use the OpenAI provider to generate a response
      const response = await this.provider.complete(messages, {
        model: this.config.model,
        temperature: this.config.temperature,
        maxTokens: this.config.maxTokens
      });
      
      // Create the updated state with the response
      const updatedState: Partial<GraphState> = {
        messages: [
          ...messages,
          { role: 'assistant', content: response.text }
        ]
      };
      
      // Check if there are any artifacts to add to the state
      if (response.metadata) {
        updatedState.artifacts = [
          ...(state.artifacts || []),
          {
            type: 'text',
            content: response.text,
            metadata: response.metadata
          }
        ];
      }
      
      return {
        output: response.text,
        updatedState
      };
    } catch (error) {
      console.error('[OpenAIAgent] Error invoking agent:', error);
      
      return {
        output: 'Error invoking OpenAI agent',
        updatedState: {},
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  }
  
  /**
   * Validates if the agent can process the current state
   */
  validateInput(state: GraphState): boolean {
    // Check if messages exist and are in the expected format
    if (!Array.isArray(state.messages) || state.messages.length === 0) {
      return false;
    }
    
    // Validate message structure
    return state.messages.every(message => 
      typeof message === 'object' &&
      (message.role === 'user' || message.role === 'system' || message.role === 'assistant' || message.role === 'tool') &&
      typeof message.content === 'string'
    );
  }
  
  /**
   * Generate embeddings using OpenAI embedding models
   */
  async createEmbedding(text: string): Promise<number[]> {
    return this.provider.createEmbedding(text, {
      model: 'text-embedding-ada-002'
    });
  }
  
  /**
   * Generate an image using DALL-E
   */
  async generateImage(prompt: string): Promise<string> {
    return this.provider.generateImage(prompt, {
      model: 'dall-e-3'
    });
  }
  
  /**
   * Analyze an image using GPT-4 Vision
   */
  async analyzeImage(imageUrl: string, prompt: string): Promise<string> {
    const response = await this.provider.analyzeImage(
      imageUrl, 
      prompt,
      {
        model: 'gpt-4-vision-preview',
        maxTokens: 300
      }
    );
    
    return response.text;
  }
}