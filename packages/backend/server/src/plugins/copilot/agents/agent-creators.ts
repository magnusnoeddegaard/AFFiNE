import { AgentCapability } from '../types';
import { AgentConfig, LanggraphAgent } from './base-agent';
import { AgentCreator } from './agent-factory';
import { OpenAIAgent, OpenAIAgentConfig } from './openai-agent';
import { PerplexityAgent, PerplexityAgentConfig } from './perplexity-agent';
import { GoogleAgent, GoogleAgentConfig } from './google-agent';
import { FALAgent, FALAgentConfig } from './fal-agent';

/**
 * OpenAI Agent Creator
 */
export const openAIAgentCreator: AgentCreator<OpenAIAgentConfig> = {
  name: 'openai',
  capabilities: [
    AgentCapability.TextGeneration,
    AgentCapability.Embedding,
    AgentCapability.ImageGeneration,
    AgentCapability.ImageAnalysis,
    AgentCapability.ToolUse
  ],
  create: (config: OpenAIAgentConfig): LanggraphAgent => {
    return new OpenAIAgent(config);
  }
};

/**
 * Perplexity Agent Creator
 */
export const perplexityAgentCreator: AgentCreator<PerplexityAgentConfig> = {
  name: 'perplexity',
  capabilities: [
    AgentCapability.TextGeneration
  ],
  create: (config: PerplexityAgentConfig): LanggraphAgent => {
    return new PerplexityAgent(config);
  }
};

/**
 * Google Agent Creator
 */
export const googleAgentCreator: AgentCreator<GoogleAgentConfig> = {
  name: 'google',
  capabilities: [
    AgentCapability.TextGeneration,
    AgentCapability.ImageAnalysis
  ],
  create: (config: GoogleAgentConfig): LanggraphAgent => {
    return new GoogleAgent(config);
  }
};

/**
 * FAL Agent Creator
 */
export const falAgentCreator: AgentCreator<FALAgentConfig> = {
  name: 'fal',
  capabilities: [
    AgentCapability.ImageGeneration,
    AgentCapability.TextGeneration
  ],
  create: (config: FALAgentConfig): LanggraphAgent => {
    return new FALAgent(config);
  }
};

/**
 * Register all agent creators with the agent factory
 */
export function registerAgentCreators(agentFactory: any): void {
  agentFactory.register(openAIAgentCreator);
  agentFactory.register(perplexityAgentCreator);
  agentFactory.register(googleAgentCreator);
  agentFactory.register(falAgentCreator);
}