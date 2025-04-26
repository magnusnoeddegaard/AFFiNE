import { AgentCapability } from '../types';
import { AgentConfig, LanggraphAgent } from './base-agent';

/**
 * Interface for agent creator functions
 */
export interface AgentCreator<T extends AgentConfig = AgentConfig> {
  name: string;
  capabilities: AgentCapability[];
  create(config: T): LanggraphAgent;
}

/**
 * Factory for creating and managing agent instances
 */
export class AgentFactory {
  private agentCreators: Map<string, AgentCreator> = new Map();
  private agentInstances: Map<string, LanggraphAgent> = new Map();

  /**
   * Register an agent creator
   * @param agentCreator The agent creator to register
   */
  register(agentCreator: AgentCreator): void {
    this.agentCreators.set(agentCreator.name, agentCreator);
  }

  /**
   * Unregister an agent creator
   * @param agentName Name of the agent creator to unregister
   */
  unregister(agentName: string): void {
    this.agentCreators.delete(agentName);
    // Also remove any instances of this agent
    const instancesToRemove = Array.from(this.agentInstances.entries())
      .filter(([_, agent]) => agent.name === agentName)
      .map(([id]) => id);
    
    instancesToRemove.forEach(id => this.agentInstances.delete(id));
  }

  /**
   * Create a new agent instance for a specific capability
   * @param capability The capability the agent should have
   * @param config Optional configuration for the agent
   * @returns A new agent instance
   * @throws Error if no agent is found for the capability
   */
  createAgent(capability: AgentCapability, config: AgentConfig = {}): LanggraphAgent {
    // Find the first agent creator that supports this capability
    const creator = Array.from(this.agentCreators.values())
      .find(creator => creator.capabilities.includes(capability));
    
    if (!creator) {
      throw new Error(`No agent found for capability: ${capability}`);
    }
    
    // Create and store the agent instance
    const agent = creator.create(config);
    const instanceId = `${agent.name}_${Date.now()}`;
    this.agentInstances.set(instanceId, agent);
    
    return agent;
  }

  /**
   * Get an agent by instance name
   * @param instanceId The instance ID of the agent
   * @returns The agent instance or null if not found
   */
  getAgentById(instanceId: string): LanggraphAgent | null {
    return this.agentInstances.get(instanceId) || null;
  }

  /**
   * Get an agent creator by name
   * @param name The name of the agent creator
   * @returns The agent creator or null if not found
   */
  getCreatorByName(name: string): AgentCreator | null {
    return this.agentCreators.get(name) || null;
  }

  /**
   * Get all available capabilities from registered agent creators
   * @returns Array of unique capabilities
   */
  getAvailableCapabilities(): AgentCapability[] {
    const capabilities = new Set<AgentCapability>();
    this.agentCreators.forEach(creator => {
      creator.capabilities.forEach(capability => capabilities.add(capability));
    });
    return Array.from(capabilities);
  }
}