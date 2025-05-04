import { Module, OnModuleInit } from '@nestjs/common';
import { AgentFactory } from './agent-factory';
import { 
  openAIAgentCreator, 
  perplexityAgentCreator, 
  googleAgentCreator,
  falAgentCreator,
  registerAgentCreators 
} from './agent-creators';

/**
 * NestJS module for AI agents
 * Provides and exports the AgentFactory for use in other modules
 */
@Module({
  providers: [
    {
      provide: AgentFactory,
      useClass: AgentFactory
    }
  ],
  exports: [AgentFactory]
})
export class AgentsModule implements OnModuleInit {
  constructor(private readonly agentFactory: AgentFactory) {}

  /**
   * Register all agent creators when the module is initialized
   */
  onModuleInit() {
    // Register all agent creators
    registerAgentCreators(this.agentFactory);
    
    console.log('AgentsModule initialized with agents:', 
      this.agentFactory.getAvailableCapabilities());
  }
}