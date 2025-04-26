import { GraphState, NodeType } from '../types';
import { BaseNode, NodeConfig } from './base-node';
import { LanggraphAgent } from '../agents/base-agent';

/**
 * Configuration for agent nodes
 */
export interface AgentNodeConfig extends NodeConfig {
  agent: LanggraphAgent;
  onError?: string;
}

/**
 * Node that invokes an agent to process state
 */
export class AgentNode extends BaseNode {
  private agent: LanggraphAgent;
  private onError: string | null;

  constructor(config: AgentNodeConfig) {
    super({
      ...config,
      type: NodeType.Agent
    });
    
    this.agent = config.agent;
    this.onError = config.onError || null;
  }

  /**
   * Check if the agent can process this state
   */
  override canProcess(state: GraphState): boolean {
    return this.agent.validateInput(state);
  }

  /**
   * Process the state by invoking the agent
   */
  async process(state: GraphState): Promise<GraphState> {
    try {
      // Apply pre-processing transformers
      let processedState = await this.applyTransformers(state);
      
      // Only proceed if the agent can process this state
      if (!this.agent.validateInput(processedState)) {
        throw new Error(`Agent ${this.agent.name} cannot process the current state`);
      }
      
      // Invoke the agent
      const response = await this.agent.invoke(processedState);
      
      // Apply agent's state updates
      if (response.updatedState) {
        processedState = {
          ...processedState,
          ...response.updatedState
        };
      }
      
      // Determine the next node based on agent response
      const nextNode = this.agent.getNextNode(response);
      if (nextNode) {
        processedState.currentNode = nextNode;
      }
      
      // Apply post-processing transformers
      return this.applyTransformers(processedState, response);
    } catch (error) {
      console.error(`Error in AgentNode ${this.id}:`, error);
      
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