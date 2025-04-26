import { BaseAgent, AgentConfig } from './base-agent';
import { FALProvider } from '../providers/fal-provider';
import { AgentCapability, AgentResponse, Artifact, GraphState } from '../types';

/**
 * Configuration options for FAL agent
 */
export interface FALAgentConfig extends AgentConfig {
  model?: string;
  imageModel?: string;
  width?: number;
  height?: number;
  steps?: number;
  seedImage?: string;
  guidance?: number;
  numImages?: number;
  promptStrength?: number;
  apiKey?: string;
}

/**
 * FAL-based agent specializing in image generation
 */
export class FALAgent extends BaseAgent<FALAgentConfig> {
  private provider: FALProvider;
  
  constructor(config: FALAgentConfig) {
    super(
      'fal-agent',
      [
        AgentCapability.ImageGeneration,
        AgentCapability.TextGeneration
      ],
      {
        // Default configuration
        imageModel: 'stable-diffusion-xl',
        width: 1024,
        height: 1024,
        steps: 50,
        guidance: 7.5,
        numImages: 1,
        promptStrength: 0.8,
        ...config
      }
    );
    
    // Initialize the FAL provider
    this.provider = new FALProvider({
      apiKey: config.apiKey,
      model: config.model,
      imageModel: config.imageModel,
      width: config.width,
      height: config.height,
      steps: config.steps,
      seedImage: config.seedImage,
      guidance: config.guidance,
      numImages: config.numImages,
      promptStrength: config.promptStrength
    });
  }
  
  /**
   * Invoke the FAL agent to process the current state
   * 
   * FAL agent primarily focuses on image generation, but can also handle text
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
    
    // Check if this is an image generation request
    const isImageGenerationRequest = this.isImageGenerationRequest(messages);
    
    if (isImageGenerationRequest) {
      return this.handleImageGeneration(state);
    } else {
      // If it's not an image generation request, use text generation
      try {
        // Use the FAL provider to generate a text response
        const response = await this.provider.complete(messages, {
          model: this.config.model
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
        console.error('[FALAgent] Error invoking agent for text generation:', error);
        
        return {
          output: 'Error invoking FAL agent for text generation',
          updatedState: {},
          error: error instanceof Error ? error : new Error(String(error))
        };
      }
    }
  }
  
  /**
   * Generate an image based on the prompt in the state
   */
  private async handleImageGeneration(state: GraphState): Promise<AgentResponse> {
    // Extract the prompt from the latest user message
    const latestUserMessage = [...state.messages]
      .reverse()
      .find(msg => msg.role === 'user');
    
    if (!latestUserMessage) {
      return {
        output: 'No user message found for image generation',
        updatedState: {},
        error: new Error('No user message found for image generation')
      };
    }
    
    const prompt = latestUserMessage.content;
    
    try {
      // Use the FAL provider to generate an image
      const imageUrl = await this.provider.generateImage(prompt, {
        imageModel: this.config.imageModel,
        width: this.config.width,
        height: this.config.height,
        steps: this.config.steps,
        guidance: this.config.guidance,
        seedImage: this.config.seedImage,
        numImages: this.config.numImages,
        promptStrength: this.config.promptStrength
      });
      
      // Create a response message
      const responseMessage = {
        role: 'assistant' as const,
        content: `I've generated an image based on your prompt: "${prompt}"`
      };
      
      // Create an image artifact
      const imageArtifact: Artifact = {
        type: 'image',
        content: imageUrl,
        metadata: {
          prompt,
          model: this.config.imageModel,
          provider: 'fal',
          width: this.config.width,
          height: this.config.height
        }
      };
      
      // Create the updated state with the response
      const updatedState: Partial<GraphState> = {
        messages: [
          ...state.messages,
          responseMessage
        ],
        artifacts: [
          ...(state.artifacts || []),
          imageArtifact
        ]
      };
      
      return {
        output: imageUrl,
        updatedState
      };
    } catch (error) {
      console.error('[FALAgent] Error generating image:', error);
      
      return {
        output: 'Error generating image',
        updatedState: {},
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  }
  
  /**
   * Determine if this is an image generation request
   */
  private isImageGenerationRequest(messages: GraphState['messages']): boolean {
    // Extract the latest user message
    const latestUserMessage = [...messages]
      .reverse()
      .find(msg => msg.role === 'user');
    
    if (!latestUserMessage) {
      return false;
    }
    
    // Check if the message contains image generation keywords
    const content = latestUserMessage.content.toLowerCase();
    const imageGenerationKeywords = [
      'generate image',
      'create image',
      'draw',
      'picture of',
      'image of',
      'visualize',
      'generate a picture',
      'make an image',
      'produce an image',
      'render',
      'generate an illustration'
    ];
    
    return imageGenerationKeywords.some(keyword => content.includes(keyword)) || 
      latestUserMessage.metadata?.requestType === 'image_generation';
  }
}