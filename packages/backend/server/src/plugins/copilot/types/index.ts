/**
 * Types for the Langgraph Agent system
 */

// Basic message types
export interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  metadata?: Record<string, any>;
  name?: string;
}

// Artifact represents any output generated during agent execution
export interface Artifact {
  type: 'text' | 'image' | 'file' | 'embedding' | 'other';
  content: any;
  metadata?: Record<string, any>;
}

// Common state interface for all graph executions
export interface GraphState {
  // Core properties
  messages: Message[];
  currentNode: string;
  visitedNodes: string[];
  artifacts: Artifact[];
  
  // Custom properties can be added as needed
  [key: string]: any;
}

// Agent capabilities
export enum AgentCapability {
  TextGeneration = 'text_generation',
  Embedding = 'embedding',
  ImageGeneration = 'image_generation',
  ImageAnalysis = 'image_analysis',
  ToolUse = 'tool_use'
}

// Tool interface for agent tools
export interface Tool {
  name: string;
  description: string;
  parameters: Record<string, any>;
  execute: (params: Record<string, any>, state: GraphState) => Promise<any>;
}

// Agent response format
export interface AgentResponse {
  output: string | any;
  updatedState: Partial<GraphState>;
  nextNode?: string | null;
  error?: Error;
}

// Node types for graph
export enum NodeType {
  Agent = 'agent',
  Tool = 'tool',
  Condition = 'condition',
  Aggregator = 'aggregator'
}

// Search-related types
export interface SearchOptions {
  limit?: number;
  threshold?: number;
  filter?: (doc: any) => boolean;
}

export interface SearchResult {
  content: string;
  score: number;
  metadata?: Record<string, any>;
}

// Document interface for context
export interface Document {
  id: string;
  content: string;
  metadata?: Record<string, any>;
}