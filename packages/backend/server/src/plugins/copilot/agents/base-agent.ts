import { AgentCapability, AgentResponse, GraphState, Tool } from '../types';

/**
 * Base interface for all Langgraph agents
 */
export interface LanggraphAgent<Config = any> {
  readonly name: string;
  readonly capabilities: AgentCapability[];
  readonly tools: Tool[];
  
  // Core methods
  invoke(state: GraphState): Promise<AgentResponse>;
  validateInput(state: GraphState): boolean;
  getNextNode(response: AgentResponse): string | null;
}

/**
 * Configuration interface for agent creation
 */
export interface AgentConfig {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  tools?: Tool[];
  systemPrompt?: string;
  [key: string]: any;
}

/**
 * Abstract base class that implements the LanggraphAgent interface
 * Provides common functionality for concrete agent implementations
 */
export abstract class BaseAgent<T extends AgentConfig = AgentConfig> implements LanggraphAgent<T> {
  readonly name: string;
  readonly capabilities: AgentCapability[];
  readonly tools: Tool[];
  protected config: T;

  constructor(name: string, capabilities: AgentCapability[], config: T) {
    this.name = name;
    this.capabilities = capabilities;
    this.config = config;
    this.tools = config.tools || [];
  }

  /**
   * Abstract method to be implemented by concrete agent classes
   * @param state Current graph state
   */
  abstract invoke(state: GraphState): Promise<AgentResponse>;

  /**
   * Validates if the agent can process the current state
   * @param state Current graph state
   * @returns boolean indicating if state is valid for this agent
   */
  validateInput(state: GraphState): boolean {
    // Default implementation checks if messages exist
    return Array.isArray(state.messages) && state.messages.length > 0;
  }

  /**
   * Determines the next node to visit based on agent response
   * @param response Agent response from invoke method
   * @returns Node name or null if no specific next node
   */
  getNextNode(response: AgentResponse): string | null {
    return response.nextNode || null;
  }

  /**
   * Helper method to extract messages from state
   * @param state Current graph state
   * @returns Array of messages
   */
  protected getMessages(state: GraphState) {
    return state.messages || [];
  }
}