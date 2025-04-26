/**
 * Plugins module for AFFiNE server
 */
import { Module } from '@nestjs/common';
import { LanggraphAgentModule } from './copilot';
import { LanggraphWorkflowsModule } from './copilot/workflows';
import { AIModule } from './copilot/ai.module';

@Module({
  imports: [
    LanggraphAgentModule,
    LanggraphWorkflowsModule,
    AIModule
  ],
  exports: [
    LanggraphAgentModule,
    LanggraphWorkflowsModule,
    AIModule
  ]
})
export class PluginsModule {}