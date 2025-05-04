import { AgentFactory } from '../agents/agent-factory';
import { GraphDefinition } from '../graph/graph-definition';
import { GraphExecutor } from '../graph/graph-executor';
import { DefaultNodeFactory } from '../graph/node-factory';
import { StateManager } from '../state/state-manager';
import { AgentCapability, Artifact,GraphState, NodeType } from '../types';

/**
 * Standard workflow for image generation
 *
 * This graph implements a workflow for image generation that:
 * 1. Processes the image prompt to improve it
 * 2. Generates an image based on the improved prompt
 * 3. Optionally generates a caption for the image
 */
export class ImageGenerationGraph {
  private readonly graphDefinition: GraphDefinition;
  private readonly stateManager: StateManager;
  private readonly nodeFactory: DefaultNodeFactory;

  constructor(
    private readonly agentFactory: AgentFactory,
    stateManager: StateManager,
    nodeFactory: DefaultNodeFactory
  ) {
    this.stateManager = stateManager;
    this.nodeFactory = nodeFactory;
    this.graphDefinition = this.createGraphDefinition();
  }

  /**
   * Create the graph definition for image generation
   */
  private createGraphDefinition(): GraphDefinition {
    return {
      name: 'image_generation',
      nodes: {
        // Starting node - prepare the image prompt
        prepare: {
          type: NodeType.Tool,
          config: {
            name: 'prepare_prompt',
            execute: async (state: GraphState) => {
              // Initialize state if needed
              return {
                ...state,
                promptProcessed: false,
              };
            },
          },
        },

        // Prompt enhancement node - improve the raw prompt
        enhance_prompt: {
          type: NodeType.Agent,
          config: {
            capability: AgentCapability.TextGeneration,
            agentConfig: {
              model: 'gpt-4o',
              temperature: 0.7,
              maxTokens: 500,
              systemPrompt: `You are an expert at creating detailed image generation prompts. 
              Your task is to take the user's image request and transform it into a detailed, 
              descriptive prompt that will produce a high-quality image.
              
              Include details about:
              - Subject matter and composition
              - Style, mood, and atmosphere
              - Lighting, colors, and visual effects
              - Level of detail and focus
              
              Respond only with the enhanced prompt, without any explanations or additional text.`,
            },
          },
        },

        // Extract the enhanced prompt from the assistant's response
        extract_enhanced_prompt: {
          type: NodeType.Tool,
          config: {
            name: 'extract_prompt',
            execute: async (state: GraphState) => {
              // Get the latest assistant message
              const latestAssistantMessage = [...state.messages]
                .reverse()
                .find(msg => msg.role === 'assistant');

              if (!latestAssistantMessage) {
                return state;
              }

              // Extract the prompt from the assistant's message
              const enhancedPrompt = latestAssistantMessage.content.trim();

              return {
                ...state,
                enhancedPrompt,
                promptProcessed: true,
              };
            },
          },
        },

        // Image generation node - create the image
        generate_image: {
          type: NodeType.Agent,
          config: {
            capability: AgentCapability.ImageGeneration,
            agentConfig: {
              imageModel: 'stable-diffusion-xl',
              width: 1024,
              height: 1024,
              steps: 50,
              guidance: 7.5,
            },
          },
        },

        // Condition node - check if caption generation is requested
        check_caption: {
          type: NodeType.Condition,
          config: {
            check: (state: GraphState) => {
              // Check if caption generation is requested in the state
              return state.generateCaption === true
                ? 'generate_caption'
                : 'end';
            },
          },
        },

        // Caption generation node - generate a caption for the image
        generate_caption: {
          type: NodeType.Agent,
          config: {
            capability: AgentCapability.ImageAnalysis,
            agentConfig: {
              model: 'gpt-4-vision-preview',
              temperature: 0.7,
              maxTokens: 300,
              systemPrompt: `Create a concise, descriptive caption for this image.
              The caption should be 1-2 sentences that accurately describe the main
              elements and style of the image.`,
            },
          },
        },

        // Store caption artifact
        store_caption: {
          type: NodeType.Tool,
          config: {
            name: 'store_caption',
            execute: async (state: GraphState) => {
              // Get the latest assistant message (from caption generation)
              const latestAssistantMessage = [...state.messages]
                .reverse()
                .find(msg => msg.role === 'assistant');

              if (!latestAssistantMessage) {
                return state;
              }

              // Find the image artifact
              const imageArtifact = state.artifacts?.find(
                a => a.type === 'image'
              );

              if (!imageArtifact) {
                return state;
              }

              // Add the caption as an additional artifact
              const captionArtifact: Artifact = {
                type: 'text',
                content: latestAssistantMessage.content,
                metadata: {
                  type: 'caption',
                  imageId: imageArtifact.metadata?.id || 'unknown',
                  generatedAt: new Date().toISOString(),
                },
              };

              return {
                ...state,
                artifacts: [...(state.artifacts || []), captionArtifact],
                caption: latestAssistantMessage.content,
              };
            },
          },
        },

        // End node for completing the workflow
        end: {
          type: NodeType.Tool,
          config: {
            name: 'finalize_image_generation',
            execute: async (state: GraphState) => {
              // Finalize the state and prepare for return
              return {
                ...state,
                completed: true,
                completedAt: new Date().toISOString(),
              };
            },
          },
        },
      },
      edges: {
        prepare: 'enhance_prompt',
        enhance_prompt: 'extract_enhanced_prompt',
        extract_enhanced_prompt: 'generate_image',
        generate_image: 'check_caption',
        check_caption: {
          generate_caption: state => state.generateCaption === true,
          end: state => state.generateCaption !== true,
        },
        generate_caption: 'store_caption',
        store_caption: 'end',
      },
    };
  }

  /**
   * Execute the image generation graph
   */
  async run(initialState: Partial<GraphState> = {}): Promise<GraphState> {
    // Initialize state with defaults if not provided
    const state = this.stateManager.createInitialState({
      generateCaption: false, // Default to not generating a caption
      ...initialState,
    });

    // Create the graph executor
    const executor = new GraphExecutor(this.graphDefinition, this.nodeFactory);

    // Execute the graph
    return await executor.run(state);
  }

  /**
   * Execute the graph with streaming support
   */
  async streamExecution(
    initialState: Partial<GraphState> = {}
  ): Promise<AsyncIterable<{ node: string; state: GraphState }>> {
    // Initialize state with defaults if not provided
    const state = this.stateManager.createInitialState({
      generateCaption: false, // Default to not generating a caption
      ...initialState,
    });

    // Create the graph executor
    const executor = new GraphExecutor(this.graphDefinition, this.nodeFactory);

    // Stream execution
    return executor.streamExecution(state);
  }
}
