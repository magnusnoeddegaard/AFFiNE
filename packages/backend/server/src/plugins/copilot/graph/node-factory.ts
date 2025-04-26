import { NodeType } from '../types';
import { GraphNode } from '../nodes/base-node';
import { AgentNode } from '../nodes/agent-node';
import { ConditionNode } from '../nodes/condition-node';
import { ToolNode } from '../nodes/tool-node';
import { AggregatorNode } from '../nodes/aggregator-node';
import { AgentFactory } from '../agents/agent-factory';

/**
 * Factory for creating graph nodes
 */
export class DefaultNodeFactory {
  private agentFactory: AgentFactory;
  private customNodeCreators: Map<string, (id: string, config: any) => GraphNode> = new Map();

  constructor(agentFactory: AgentFactory) {
    this.agentFactory = agentFactory;
  }

  /**
   * Register a custom node creator
   * @param type Custom node type
   * @param creator Function to create the node
   */
  registerNodeCreator(type: string, creator: (id: string, config: any) => GraphNode): void {
    this.customNodeCreators.set(type, creator);
  }

  /**
   * Create a node based on the node definition
   * @param id Node ID
   * @param definition Node definition
   */
  createNode(id: string, definition: any): GraphNode {
    const { type, config = {} } = definition;
    
    // Check for custom node creators first
    if (this.customNodeCreators.has(type)) {
      const creator = this.customNodeCreators.get(type);
      return creator(id, { ...config, id });
    }
    
    // Handle standard node types
    switch (type) {
      case NodeType.Agent:
        // Create the agent if it's specified by capability
        if (config.agentCapability) {
          const agent = this.agentFactory.createAgent(
            config.agentCapability,
            config.agentConfig || {}
          );
          return new AgentNode({ ...config, id, agent });
        }
        
        // Otherwise, the agent should be directly provided
        return new AgentNode({ ...config, id });
        
      case NodeType.Condition:
        return new ConditionNode({ ...config, id });
        
      case NodeType.Tool:
        return new ToolNode({ ...config, id });
        
      case NodeType.Aggregator:
        return new AggregatorNode({ ...config, id });
        
      default:
        throw new Error(`Unknown node type: ${type}`);
    }
  }
}