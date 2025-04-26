import { GraphState, NodeType } from '../types';
import { BaseNode, NodeConfig } from './base-node';

/**
 * Type for aggregation function
 */
export type AggregationFn = (states: GraphState[]) => Promise<Partial<GraphState>> | Partial<GraphState>;

/**
 * Configuration for aggregator nodes
 */
export interface AggregatorNodeConfig extends NodeConfig {
  aggregationFn: AggregationFn;
  nextNode?: string;
}

/**
 * Node that combines results from multiple paths
 */
export class AggregatorNode extends BaseNode {
  private aggregationFn: AggregationFn;
  private nextNode: string | null;
  private pendingStates: Map<string, GraphState> = new Map();

  constructor(config: AggregatorNodeConfig) {
    super({
      ...config,
      type: NodeType.Aggregator
    });
    
    this.aggregationFn = config.aggregationFn;
    this.nextNode = config.nextNode || null;
  }

  /**
   * Process the state by aggregating pending states
   */
  async process(state: GraphState): Promise<GraphState> {
    // Store the incoming state
    const sourceNodeId = state.visitedNodes[state.visitedNodes.length - 2] || 'unknown';
    this.pendingStates.set(sourceNodeId, state);
    
    // Apply pre-processing transformers
    let processedState = await this.applyTransformers(state);
    
    // If this is just collecting states and not ready to aggregate, return as is
    if (!this.isReadyToAggregate(processedState)) {
      return processedState;
    }
    
    try {
      // Get all collected states
      const states = Array.from(this.pendingStates.values());
      
      // Run the aggregation function
      const aggregatedState = await this.aggregationFn(states);
      
      // Clear pending states after aggregation
      this.pendingStates.clear();
      
      // Merge the aggregated state
      processedState = {
        ...processedState,
        ...aggregatedState
      };
      
      // Set next node if specified
      if (this.nextNode) {
        processedState.currentNode = this.nextNode;
      }
      
      // Apply post-processing transformers
      return this.applyTransformers(processedState);
    } catch (error) {
      console.error(`Error in AggregatorNode ${this.id}:`, error);
      throw error;
    }
  }

  /**
   * Determine if the node is ready to aggregate results
   * This is a placeholder - derived classes should implement specific logic
   */
  protected isReadyToAggregate(_state: GraphState): boolean {
    // Default implementation: always ready when there are pending states
    return this.pendingStates.size > 0;
  }

  /**
   * Get the next node based on the updated state
   */
  getNextNodes(state: GraphState): string | null {
    return state.currentNode !== this.id ? state.currentNode : this.nextNode;
  }
}