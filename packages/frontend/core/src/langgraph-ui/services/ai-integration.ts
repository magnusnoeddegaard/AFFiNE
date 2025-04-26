import { inject, injectable } from '@toeverything/infra';
import { WorkbenchService } from '@affine/core/modules/workbench';
import { FeatureFlagService } from '@affine/core/modules/feature-flag';
import { AIProvider } from '../../blocksuite/ai/provider';
import { AIService, initializeAIService } from './ai-service';

/**
 * Service responsible for integrating AI functionality with the application
 */
@injectable()
export class AIIntegrationService {
  private aiService: AIService;

  constructor(
    @inject(WorkbenchService) private workbenchService: WorkbenchService,
    @inject(FeatureFlagService) private featureFlagService: FeatureFlagService
  ) {
    this.aiService = initializeAIService();
    this.initialize();
  }

  /**
   * Initialize AI integrations with the application
   */
  private initialize() {
    // Register event handlers for AI functionality
    document.addEventListener('keydown', this.handleKeyboardShortcuts);
    
    // Initialize AI capabilities based on feature flags
    this.featureFlagService.flags.enable_ai$.subscribe(enableAI => {
      if (enableAI) {
        this.enableAIFeatures();
      } else {
        this.disableAIFeatures();
      }
    });
  }

  /**
   * Enable AI features in the application
   */
  private enableAIFeatures() {
    // Initialize AI Provider with capabilities
    AIProvider.capabilities = {
      chat: true,
      image: true,
      embedding: true,
      action: true,
      selection: true
    };

    // Set up UI integration points
    this.setupEntryPoints();
  }

  /**
   * Disable AI features in the application
   */
  private disableAIFeatures() {
    AIProvider.capabilities = {
      chat: false,
      image: false,
      embedding: false,
      action: false,
      selection: false
    };
    
    // Remove AI entry points if needed
  }

  /**
   * Set up entry points for AI functionality in the UI
   */
  private setupEntryPoints() {
    // Register action handlers for AI functionality
    AIProvider.slots.requestOpenWithChat.subscribe(({ host }) => {
      if (!host) return;
      
      // Open the sidebar and activate the chat tab
      const workbench = this.workbenchService.workbench;
      workbench.openSidebar();
      workbench.view.activeSidebarTab('chat');
    });
  }

  /**
   * Handle keyboard shortcuts for AI functionality
   */
  private handleKeyboardShortcuts = (event: KeyboardEvent) => {
    // Alt+A to activate AI chat
    if (event.altKey && event.key === 'a') {
      const workbench = this.workbenchService.workbench;
      workbench.openSidebar();
      workbench.view.activeSidebarTab('chat');
      event.preventDefault();
    }
  };

  /**
   * Clean up resources when the service is destroyed
   */
  dispose() {
    document.removeEventListener('keydown', this.handleKeyboardShortcuts);
  }
}

/**
 * Component to initialize AI features when the application loads
 */
export function AIInitializer() {
  // This is a placeholder component to initialize AI in a React component tree
  return null;
}