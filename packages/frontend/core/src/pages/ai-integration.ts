import { frameworks, getCurrentStore } from '@toeverything/infra';
import { AIIntegrationService } from '../langgraph-ui/services/ai-integration';
import { AIService, initializeAIService } from '../langgraph-ui/services/ai-service';
import { FeatureFlagService } from '../modules/feature-flag';

let aiIntegrationService: AIIntegrationService | null = null;

/**
 * Initialize AI integration for the application
 */
export async function initializeAI(): Promise<void> {
  const store = getCurrentStore();
  if (!store) {
    console.warn('Store not available, cannot initialize AI');
    return;
  }

  // Get the current framework
  const frameworkProvider = frameworks.get(store);
  if (!frameworkProvider) {
    console.warn('Framework not available, cannot initialize AI');
    return;
  }

  // Initialize the feature flag service to check if AI is enabled
  const featureFlagService = frameworkProvider.get(FeatureFlagService);
  const enableAI = await featureFlagService.flags.enable_ai$.get();
  if (!enableAI) {
    console.info('AI features are disabled');
    return;
  }

  try {
    // Register services if they don't exist yet
    if (!frameworkProvider.has(AIService)) {
      frameworkProvider.impl(AIService, initializeAIService());
    }

    // Initialize the integration service
    if (!aiIntegrationService) {
      aiIntegrationService = new AIIntegrationService(
        frameworkProvider.get('WorkbenchService'),
        featureFlagService
      );
    }

    console.info('AI features initialized successfully');
  } catch (error) {
    console.error('Failed to initialize AI features', error);
  }
}

/**
 * Clean up AI integration resources
 */
export function disposeAI(): void {
  if (aiIntegrationService) {
    aiIntegrationService.dispose();
    aiIntegrationService = null;
  }
}