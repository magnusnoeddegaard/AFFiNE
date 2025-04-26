import { GraphState, NodeType, Tool } from '../types';
import { BaseNode, NodeConfig } from './base-node';

/**
 * Configuration for tool nodes
 */
export interface ToolNodeConfig extends NodeConfig {
  tool: Tool;
  inputExtractor?: (state: GraphState) => Record<string, any>;
  onSuccess?: string;
  onError?: string;
}

/**
 * Node that executes a specific tool
 */
export class ToolNode extends BaseNode {
  private tool: Tool;
  private inputExtractor: (state: GraphState) => Record<string, any>;
  private onSuccess: string | null;
  private onError: string | null;

  constructor(config: ToolNodeConfig) {
    super({
      ...config,
      type: NodeType.Tool
    });
    
    this.tool = config.tool;
    this.inputExtractor = config.inputExtractor || (state => ({}));
    this.onSuccess = config.onSuccess || null;
    this.onError = config.onError || null;
  }

  /**
   * Process the state by executing the tool
   */
  async process(state: GraphState): Promise<GraphState> {
    try {
      // Apply pre-processing transformers
      let processedState = await this.applyTransformers(state);
      
      // Extract input parameters for the tool
      const params = this.inputExtractor(processedState);
      
      // Execute the tool
      const result = await this.tool.execute(params, processedState);
      
      // Add tool result to state
      processedState = {
        ...processedState,
        toolResult: result,
        // Add a tool message if it's appropriate
        messages: [
          ...processedState.messages,
          {
            role: 'tool',
            name: this.tool.name,
            content: typeof result === 'string' ? result : JSON.stringify(result)
          }
        ]
      };
      
      // Set next node if success handler is specified
      if (this.onSuccess) {
        processedState.currentNode = this.onSuccess;
      }
      
      // Apply post-processing transformers
      return this.applyTransformers(processedState, result);
    } catch (error) {
      console.error(`Error in ToolNode ${this.id}:`, error);
      
      // If onError is defined, set the next node
      if (this.onError) {
        return {
          ...state,
          currentNode: this.onError,
          error: error instanceof Error ? error : new Error(String(error))
        };
      }
      
      // Otherwise re-throw the error
      throw error;
    }
  }

  /**
   * Get the next node based on the updated state
   */
  getNextNodes(state: GraphState): string | null {
    return state.currentNode !== this.id ? state.currentNode : null;
  }
}