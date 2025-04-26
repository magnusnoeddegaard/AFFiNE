import { GraphState } from '../types';
import { GraphNode } from '../nodes/base-node';
import { GraphDefinition } from './graph-definition';
import { StateManager } from '../state/state-manager';

/**
 * Interface for a node factory that creates graph nodes from definitions
 */
export interface NodeFactory {
  createNode(id: string, definition: any): GraphNode;
}

/**
 * Class for executing graph workflows
 */
export class GraphExecutor {
  private definition: GraphDefinition;
  private nodes: Map<string, GraphNode> = new Map();
  private stateManager: StateManager;
  private nodeFactory: NodeFactory;

  constructor(
    definition: GraphDefinition,
    nodeFactory: NodeFactory,
    stateManager: StateManager = new StateManager()
  ) {
    this.definition = definition;
    this.nodeFactory = nodeFactory;
    this.stateManager = stateManager;
    this.initializeNodes();
  }

  /**
   * Initialize all nodes from the graph definition
   */
  private initializeNodes(): void {
    for (const [id, nodeDefinition] of Object.entries(this.definition.nodes)) {
      const node = this.nodeFactory.createNode(id, nodeDefinition);
      this.nodes.set(id, node);
    }
  }

  /**
   * Get the next node ID(s) based on graph edges
   */
  private getNextNodeIds(currentNodeId: string, state: GraphState): string[] {
    const edge = this.definition.edges[currentNodeId];
    
    if (!edge) {
      return [];
    }
    
    if (typeof edge === 'string') {
      return [edge];
    }
    
    if (Array.isArray(edge)) {
      return edge;
    }
    
    // Handle conditional edges
    const conditionalEdges = edge as { [target: string]: (state: GraphState) => boolean };
    const matchingTargets: string[] = [];
    
    for (const [target, condition] of Object.entries(conditionalEdges)) {
      if (condition(state)) {
        matchingTargets.push(target);
      }
    }
    
    return matchingTargets;
  }

  /**
   * Execute the graph with an initial state
   * @param initialState Optional partial initial state
   * @returns Final state after graph execution
   */
  async run(initialState: Partial<GraphState> = {}): Promise<GraphState> {
    let state = this.stateManager.createInitialState(initialState);
    
    // Get the starting node
    let currentNodeId = state.currentNode;
    let visited = new Set<string>();
    
    // Continue execution until no more nodes or we revisit a node
    while (currentNodeId && !visited.has(currentNodeId)) {
      const node = this.nodes.get(currentNodeId);
      
      if (!node) {
        throw new Error(`Node not found: ${currentNodeId}`);
      }
      
      // Process the node
      state = await node.process(state);
      
      // Mark as visited
      visited.add(currentNodeId);
      
      // Get the next node ID from the node itself
      const nextFromNode = node.getNextNodes(state);
      
      if (nextFromNode) {
        currentNodeId = Array.isArray(nextFromNode) ? nextFromNode[0] : nextFromNode;
      } else {
        // If no next node from the node, check graph edges
        const nextIds = this.getNextNodeIds(currentNodeId, state);
        currentNodeId = nextIds.length > 0 ? nextIds[0] : null;
      }
      
      // Update the state with the new current node
      if (currentNodeId) {
        state.currentNode = currentNodeId;
      }
    }
    
    return state;
  }

  /**
   * Execute the graph and stream intermediate states
   * @param initialState Optional partial initial state
   * @returns AsyncIterable of node and state pairs
   */
  async *streamExecution(
    initialState: Partial<GraphState> = {}
  ): AsyncIterable<{ node: string; state: GraphState }> {
    let state = this.stateManager.createInitialState(initialState);
    
    // Get the starting node
    let currentNodeId = state.currentNode;
    let visited = new Set<string>();
    
    // Continue execution until no more nodes or we revisit a node
    while (currentNodeId && !visited.has(currentNodeId)) {
      const node = this.nodes.get(currentNodeId);
      
      if (!node) {
        throw new Error(`Node not found: ${currentNodeId}`);
      }
      
      // Process the node
      state = await node.process(state);
      
      // Yield the current node and state
      yield { node: currentNodeId, state };
      
      // Mark as visited
      visited.add(currentNodeId);
      
      // Get the next node ID from the node itself
      const nextFromNode = node.getNextNodes(state);
      
      if (nextFromNode) {
        currentNodeId = Array.isArray(nextFromNode) ? nextFromNode[0] : nextFromNode;
      } else {
        // If no next node from the node, check graph edges
        const nextIds = this.getNextNodeIds(currentNodeId, state);
        currentNodeId = nextIds.length > 0 ? nextIds[0] : null;
      }
      
      // Update the state with the new current node
      if (currentNodeId) {
        state.currentNode = currentNodeId;
      }
    }
  }
}