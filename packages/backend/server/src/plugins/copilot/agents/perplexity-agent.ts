import { BaseAgent, AgentConfig } from './base-agent';
import { PerplexityProvider } from '../providers/perplexity-provider';
import { AgentCapability, AgentResponse, GraphState } from '../types';

/**
 * Configuration options for Perplexity agent
 */
export interface PerplexityAgentConfig extends AgentConfig {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  topK?: number;
  apiKey?: string;
  streaming?: boolean;
}

/**
 * Perplexity-based LLM agent
 * 
 * Perplexity models excel at factual search and retrieval
 */
export class PerplexityAgent extends BaseAgent<PerplexityAgentConfig> {
  private provider: PerplexityProvider;
  
  constructor(config: PerplexityAgentConfig) {
    super(
      'perplexity-agent',
      [
        AgentCapability.TextGeneration
      ],
      {
        // Default configuration
        model: 'pplx-70b-online',
        temperature: 0.7,
        maxTokens: 1000,
        ...config
      }
    );
    
    // Initialize the Perplexity provider
    this.provider = new PerplexityProvider({
      apiKey: config.apiKey,
      model: config.model || 'pplx-70b-online', // Ensure model is never undefined
      temperature: config.temperature,
      maxTokens: config.maxTokens,
      topP: config.topP,
      topK: config.topK
    });
  }
  
  /**
   * Invoke the Perplexity agent to process the current state
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
      // Use the Perplexity provider to generate a response
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
      console.error('[PerplexityAgent] Error invoking agent:', error);
      
      return {
        output: 'Error invoking Perplexity agent',
        updatedState: {},
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  }
  
  /**
   * Validates if the agent can process the current state
   * 
   * Perplexity works best with questions and search-oriented prompts
   */
  validateInput(state: GraphState): boolean {
    // Basic validation similar to base agent
    if (!super.validateInput(state)) {
      return false;
    }
    
    // Perform additional checks specific to Perplexity
    // For example, we might want to prioritize this agent for factual queries
    // Here, we could check if the messages contain questions or search-like queries
    
    // For now, we'll use a simple approach to detect if it seems like a knowledge-based query
    const latestUserMessage = [...state.messages].reverse()
      .find(msg => msg.role === 'user')?.content || '';
    
    // Simple heuristic to detect knowledge queries (contains a question or search patterns)
    const searchPatterns = [
      /\?$/, // Ends with question mark
      /^(what|who|how|when|where|why)/i, // Starts with question words
      /find|search|lookup|tell me about|information on/i // Contains search-like terms
    ];
    
    // Return true for all inputs, but the agent factory might use these checks to select
    // between different agents based on the query type
    return true;
  }
}