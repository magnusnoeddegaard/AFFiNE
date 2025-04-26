import { GraphState, NodeType } from '../types';
import { BaseNode, NodeConfig } from './base-node';

/**
 * Type for condition function that evaluates state
 */
export type ConditionFn = (state: GraphState) => boolean;

/**
 * Configuration for conditional nodes
 */
export interface ConditionNodeConfig extends NodeConfig {
  conditions: {
    [targetNodeId: string]: ConditionFn;
  };
  defaultNode?: string;
}

/**
 * Node that evaluates conditions to determine the next node
 */
export class ConditionNode extends BaseNode {
  private conditions: {
    [targetNodeId: string]: ConditionFn;
  };
  private defaultNode: string | null;

  constructor(config: ConditionNodeConfig) {
    super({
      ...config,
      type: NodeType.Condition
    });
    
    this.conditions = config.conditions;
    this.defaultNode = config.defaultNode || null;
  }

  /**
   * Process the state by evaluating conditions
   * Condition nodes don't modify state, they just determine the next node
   */
  async process(state: GraphState): Promise<GraphState> {
    // Apply any transformers if defined
    return this.applyTransformers(state);
  }

  /**
   * Determine the next node based on condition evaluation
   */
  getNextNodes(state: GraphState): string | null {
    // Check each condition in the order they were defined
    for (const [nodeId, condition] of Object.entries(this.conditions)) {
      if (condition(state)) {
        return nodeId;
      }
    }
    
    // Return default node if no conditions match
    return this.defaultNode;
  }
}