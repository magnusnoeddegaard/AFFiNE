import { NodeType } from '../types';

/**
 * Interface for graph node definitions
 */
export interface GraphNodeDefinition {
  type: NodeType;
  config?: Record<string, any>;
}

/**
 * Interface for edge condition
 */
export type EdgeCondition = (state: any) => boolean;

/**
 * Interface for complete graph definition
 */
export interface GraphDefinition {
  name: string;
  description?: string;
  nodes: {
    [key: string]: GraphNodeDefinition;
  };
  edges: {
    [source: string]: string | string[] | {
      [target: string]: EdgeCondition;
    };
  };
}

/**
 * Builder class for creating graph definitions
 */
export class GraphDefinitionBuilder {
  private name: string;
  private description: string = '';
  private nodes: { [key: string]: GraphNodeDefinition } = {};
  private edges: {
    [source: string]: string | string[] | { [target: string]: EdgeCondition };
  } = {};

  constructor(name: string) {
    this.name = name;
  }

  /**
   * Set the graph description
   * @param description Description of the graph
   */
  setDescription(description: string): GraphDefinitionBuilder {
    this.description = description;
    return this;
  }

  /**
   * Add a node to the graph
   * @param id Node ID
   * @param type Node type
   * @param config Node configuration
   */
  addNode(id: string, type: NodeType, config: Record<string, any> = {}): GraphDefinitionBuilder {
    this.nodes[id] = { type, config };
    return this;
  }

  /**
   * Add an edge between nodes
   * @param source Source node ID
   * @param target Target node ID
   */
  addEdge(source: string, target: string): GraphDefinitionBuilder {
    this.edges[source] = target;
    return this;
  }

  /**
   * Add multiple edges from a source node
   * @param source Source node ID
   * @param targets Array of target node IDs
   */
  addEdges(source: string, targets: string[]): GraphDefinitionBuilder {
    this.edges[source] = targets;
    return this;
  }

  /**
   * Add conditional edges from a source node
   * @param source Source node ID
   * @param conditions Mapping of target nodes to condition functions
   */
  addConditionalEdges(
    source: string,
    conditions: { [target: string]: EdgeCondition }
  ): GraphDefinitionBuilder {
    this.edges[source] = conditions;
    return this;
  }

  /**
   * Build the complete graph definition
   */
  build(): GraphDefinition {
    return {
      name: this.name,
      description: this.description,
      nodes: this.nodes,
      edges: this.edges,
    };
  }
}