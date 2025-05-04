import { BaseAgent, AgentConfig } from './base-agent';
import { GoogleProvider } from '../providers/google-provider';
import { AgentCapability, AgentResponse, GraphState } from '../types';

/**
 * Configuration options for Google Gemini agent
 */
export interface GoogleAgentConfig extends AgentConfig {
  model?: string;
  temperature?: number;
  maxOutputTokens?: number;
  topP?: number;
  topK?: number;
  apiKey?: string;
  streaming?: boolean;
  safetySettings?: Array<{
    category: string;
    threshold: string;
  }>;
}

/**
 * Google Gemini-based LLM agent
 */
export class GoogleAgent extends BaseAgent<GoogleAgentConfig> {
  private provider: GoogleProvider;
  
  constructor(config: GoogleAgentConfig) {
    super(
      'google-agent',
      [
        AgentCapability.TextGeneration,
        AgentCapability.ImageAnalysis
      ],
      {
        // Default configuration
        model: 'gemini-1.5-pro',
        temperature: 0.7,
        maxOutputTokens: 1000,
        ...config
      }
    );
    
    // Initialize the Google provider
    this.provider = new GoogleProvider({
      apiKey: config.apiKey,
      model: config.model || 'gemini-1.5-pro', // Ensure model is never undefined
      temperature: config.temperature,
      maxOutputTokens: config.maxOutputTokens,
      topP: config.topP,
      topK: config.topK,
      safetySettings: config.safetySettings
    });
  }
  
  /**
   * Invoke the Google Gemini agent to process the current state
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
      // Check if there are image references in the messages and process them
      const hasImageReferences = messages.some(msg => 
        msg.content.includes('![') || // Markdown image syntax
        msg.metadata?.image || // Explicit image metadata
        (msg.metadata?.contentType && msg.metadata.contentType.startsWith('image/')) // Content type
      );
      
      // If there are image references, switch to a vision-capable model
      const modelToUse = hasImageReferences ? 'gemini-pro-vision' : this.config.model;
      
      // Use the Google provider to generate a response
      const response = await this.provider.complete(messages, {
        model: modelToUse,
        temperature: this.config.temperature,
        maxOutputTokens: this.config.maxOutputTokens
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
      console.error('[GoogleAgent] Error invoking agent:', error);
      
      return {
        output: 'Error invoking Google Gemini agent',
        updatedState: {},
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  }
  
  /**
   * Analyze an image using Gemini Pro Vision
   */
  async analyzeImage(imageUrl: string, prompt: string): Promise<string> {
    const response = await this.provider.analyzeImage(
      imageUrl, 
      prompt,
      {
        model: 'gemini-pro-vision',
        maxOutputTokens: 300
      }
    );
    
    return response.text;
  }
  
  /**
   * Handle multimodal input combining text and images
   */
  private async handleMultimodalInput(state: GraphState): Promise<AgentResponse> {
    // Extract the image URLs and prompt from the state
    const imageUrls: string[] = [];
    let textPrompt = '';
    
    // Process messages to extract image references and text
    state.messages.forEach(msg => {
      if (msg.role === 'user') {
        // If the message has an image URL in metadata, add it to imageUrls
        if (msg.metadata?.image) {
          imageUrls.push(msg.metadata.image as string);
        }
        
        // Add text content to the prompt
        textPrompt += msg.content + '\n';
      }
    });
    
    // If no images found, return an error
    if (imageUrls.length === 0) {
      return {
        output: 'No images found in the input',
        updatedState: {},
        error: new Error('No images found for multimodal analysis')
      };
    }
    
    try {
      // This is a simplified approach; in a real implementation, we would need to
      // properly construct the multimodal request with both text and images
      const response = await this.provider.analyzeImage(
        imageUrls[0], // For simplicity, just use the first image
        textPrompt,
        {
          model: 'gemini-pro-vision',
          maxOutputTokens: this.config.maxOutputTokens
        }
      );
      
      // Create the updated state with the response
      const updatedState: Partial<GraphState> = {
        messages: [
          ...state.messages,
          { role: 'assistant', content: response.text }
        ],
        artifacts: [
          ...(state.artifacts || []),
          {
            type: 'text',
            content: response.text,
            metadata: {
              provider: 'google',
              model: 'gemini-pro-vision'
            }
          }
        ]
      };
      
      return {
        output: response.text,
        updatedState
      };
    } catch (error) {
      console.error('[GoogleAgent] Error processing multimodal input:', error);
      
      return {
        output: 'Error processing image and text input',
        updatedState: {},
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  }
}