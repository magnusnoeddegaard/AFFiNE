import { GraphState, NodeType } from '../types';
import { StateTransformer } from '../state/state-manager';

/**
 * Interface for node configuration
 */
export interface NodeConfig {
  id: string;
  type: NodeType;
  [key: string]: any;
}

/**
 * Base interface for all graph nodes
 */
export interface GraphNode {
  readonly id: string;
  readonly type: NodeType;
  
  // Process the node with the current state
  process(state: GraphState): Promise<GraphState>;
  
  // Get the next node(s) to visit
  getNextNodes(state: GraphState): string | string[] | null;
  
  // Whether this node can process the current state
  canProcess(state: GraphState): boolean;
}

/**
 * Abstract base class for graph nodes
 */
export abstract class BaseNode implements GraphNode {
  readonly id: string;
  readonly type: NodeType;
  protected config: NodeConfig;
  protected stateTransformers: StateTransformer[] = [];

  constructor(config: NodeConfig) {
    this.id = config.id;
    this.type = config.type;
    this.config = config;
  }

  /**
   * Add a state transformer to this node
   * @param transformer Transformer function
   */
  addStateTransformer(transformer: StateTransformer): void {
    this.stateTransformers.push(transformer);
  }

  /**
   * Process the current state through this node
   * Must be implemented by subclasses
   */
  abstract process(state: GraphState): Promise<GraphState>;

  /**
   * Determine the next node(s) to visit
   * @param state Current state after processing
   * @returns Next node ID, array of IDs, or null
   */
  abstract getNextNodes(state: GraphState): string | string[] | null;

  /**
   * Check if this node can process the current state
   * Default implementation always returns true
   */
  canProcess(_state: GraphState): boolean {
    return true;
  }

  /**
   * Apply all registered state transformers
   * @param state Current graph state
   * @param input Optional input for transformers
   * @returns Updated state
   */
  protected async applyTransformers(
    state: GraphState,
    input?: any
  ): Promise<GraphState> {
    let currentState = { ...state };
    
    for (const transformer of this.stateTransformers) {
      const result = transformer(currentState, input);
      currentState = result instanceof Promise ? await result : result;
    }
    
    return currentState;
  }
}