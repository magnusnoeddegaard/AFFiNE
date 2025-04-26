import { WithDisposable } from '@blocksuite/affine/global/lit';
import { ShadowlessElement } from '@blocksuite/affine/std';
import { css, html } from 'lit';
import { property, state } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';

import { LanggraphChatPanel } from './chat-panel/langgraph-chat-panel';
import { ContextPanel, type ContextSource } from './context-panel/context-panel';

export enum AIWorkspaceMode {
  Chat = 'chat',
  ImageGeneration = 'image',
  DocumentAnalysis = 'document',
  Research = 'research'
}

/**
 * Main AI workspace component that integrates all AI components
 */
export class AIWorkspace extends WithDisposable(ShadowlessElement) {
  static override styles = css`
    .ai-workspace {
      display: flex;
      height: 100%;
      width: 100%;
      overflow: hidden;
      background-color: var(--affine-background-primary-color);
    }

    .ai-workspace-main {
      flex-grow: 1;
      height: 100%;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .ai-workspace-mode-selector {
      display: flex;
      padding: 8px 16px;
      border-bottom: 1px solid var(--affine-border-color);
    }

    .ai-workspace-mode-button {
      padding: 6px 12px;
      border-radius: 4px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      color: var(--affine-text-secondary-color);
    }

    .ai-workspace-mode-button:hover {
      background-color: var(--affine-hover-color);
    }

    .ai-workspace-mode-button[data-active="true"] {
      color: var(--affine-primary-color);
      background-color: var(--affine-hover-color);
    }

    .ai-workspace-content {
      flex-grow: 1;
      overflow: hidden;
      display: flex;
      height: calc(100% - 52px);
    }

    .ai-workspace-context-panel {
      width: 280px;
      height: 100%;
      flex-shrink: 0;
      border-left: 1px solid var(--affine-border-color);
      overflow-y: auto;
    }

    .ai-workspace-icon {
      font-size: 18px;
    }
  `;

  @property({ attribute: false })
  accessor mode: AIWorkspaceMode = AIWorkspaceMode.Chat;

  @state()
  accessor contextSources: ContextSource[] = [];

  @state()
  accessor currentSession: string | null = null;

  /**
   * Available context sources that can be added to the AI session
   */
  @property({ attribute: false })
  accessor availableSources: ContextSource[] = [];

  /**
   * Callback when a context source is toggled
   */
  @property({ attribute: false })
  accessor onSourceToggle?: (source: ContextSource) => void;

  /**
   * Callback when a context source is removed
   */
  @property({ attribute: false })
  accessor onSourceRemove?: (sourceId: string) => void;

  /**
   * Callback for mode changes
   */
  @property({ attribute: false })
  accessor onModeChange?: (mode: AIWorkspaceMode) => void;

  override connectedCallback() {
    super.connectedCallback();
    
    // Initialize with available sources if any
    if (this.availableSources.length > 0) {
      this.contextSources = [...this.availableSources];
    }
    
    // Create default session if needed
    if (!this.currentSession) {
      this.createNewSession();
    }
  }

  /**
   * Create a new chat session
   */
  createNewSession() {
    this.currentSession = `session-${Date.now()}`;
  }

  /**
   * Handle mode change
   */
  handleModeChange(mode: AIWorkspaceMode) {
    this.mode = mode;
    if (this.onModeChange) {
      this.onModeChange(mode);
    }
  }

  /**
   * Handle context source toggle
   */
  handleSourceToggle(source: ContextSource) {
    // Update the source in the local state
    this.contextSources = this.contextSources.map(s => 
      s.id === source.id ? source : s
    );
    
    // Call the external handler if provided
    if (this.onSourceToggle) {
      this.onSourceToggle(source);
    }
  }

  /**
   * Handle context source removal
   */
  handleSourceRemove(sourceId: string) {
    // Remove the source from the local state
    this.contextSources = this.contextSources.filter(s => s.id !== sourceId);
    
    // Call the external handler if provided
    if (this.onSourceRemove) {
      this.onSourceRemove(sourceId);
    }
  }

  /**
   * Handle toggling all sources' active state
   */
  handleToggleAll(active: boolean) {
    this.contextSources = this.contextSources.map(s => ({
      ...s,
      active
    }));
    
    // Call external handlers for each changed source
    if (this.onSourceToggle) {
      this.contextSources.forEach(s => this.onSourceToggle!(s));
    }
  }

  /**
   * Get the icon for a specific mode
   */
  getModeIcon(mode: AIWorkspaceMode) {
    switch (mode) {
      case AIWorkspaceMode.Chat:
        return '💬';
      case AIWorkspaceMode.ImageGeneration:
        return '🖼️';
      case AIWorkspaceMode.DocumentAnalysis:
        return '📄';
      case AIWorkspaceMode.Research:
        return '🔍';
      default:
        return '🤖';
    }
  }

  /**
   * Get the title for a specific mode
   */
  getModeTitle(mode: AIWorkspaceMode) {
    switch (mode) {
      case AIWorkspaceMode.Chat:
        return 'Chat';
      case AIWorkspaceMode.ImageGeneration:
        return 'Image';
      case AIWorkspaceMode.DocumentAnalysis:
        return 'Document';
      case AIWorkspaceMode.Research:
        return 'Research';
      default:
        return 'AI Session';
    }
  }

  /**
   * Render the mode-specific content
   */
  renderModeContent() {
    switch (this.mode) {
      case AIWorkspaceMode.Chat:
        return html`
          <langgraph-chat-panel
            .sessionTitle="AI Assistant"
            .sessionId=${this.currentSession || undefined}
          ></langgraph-chat-panel>
        `;
      case AIWorkspaceMode.ImageGeneration:
        return html`
          <langgraph-chat-panel
            .sessionTitle="Image Generation"
            .sessionId=${this.currentSession || undefined}
            .providerOptions=${[
              { id: 'openai', name: 'DALL-E (OpenAI)' },
              { id: 'fal', name: 'Stable Diffusion (FAL)' }
            ]}
          ></langgraph-chat-panel>
        `;
      case AIWorkspaceMode.DocumentAnalysis:
        return html`
          <langgraph-chat-panel
            .sessionTitle="Document Analysis"
            .sessionId=${this.currentSession || undefined}
          ></langgraph-chat-panel>
        `;
      case AIWorkspaceMode.Research:
        return html`
          <langgraph-chat-panel
            .sessionTitle="Research Assistant"
            .sessionId=${this.currentSession || undefined}
            .providerOptions=${[
              { id: 'perplexity', name: 'Perplexity' },
              { id: 'openai', name: 'OpenAI' },
              { id: 'google', name: 'Google' }
            ]}
          ></langgraph-chat-panel>
        `;
      default:
        return html`<div>Invalid mode selected</div>`;
    }
  }

  protected override render() {
    return html`
      <div class="ai-workspace">
        <div class="ai-workspace-main">
          <div class="ai-workspace-mode-selector">
            ${repeat(
              Object.values(AIWorkspaceMode),
              mode => mode,
              mode => html`
                <div 
                  class="ai-workspace-mode-button" 
                  data-active=${mode === this.mode}
                  @click=${() => this.handleModeChange(mode)}
                >
                  <span class="ai-workspace-icon">${this.getModeIcon(mode)}</span>
                  <span>${this.getModeTitle(mode)}</span>
                </div>
              `
            )}
          </div>
          <div class="ai-workspace-content">
            ${this.renderModeContent()}
          </div>
        </div>
        <div class="ai-workspace-context-panel">
          <context-panel
            .sources=${this.contextSources}
            .onSourceToggle=${(source: ContextSource) => this.handleSourceToggle(source)}
            .onSourceRemove=${(sourceId: string) => this.handleSourceRemove(sourceId)}
            .onToggleAll=${(active: boolean) => this.handleToggleAll(active)}
          ></context-panel>
        </div>
      </div>
    `;
  }
}

customElements.define('ai-workspace', AIWorkspace);

declare global {
  interface HTMLElementTagNameMap {
    'ai-workspace': AIWorkspace;
  }
}