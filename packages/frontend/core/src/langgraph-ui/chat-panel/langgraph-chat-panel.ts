import { WithDisposable } from '@blocksuite/affine/global/lit';
import { ShadowlessElement } from '@blocksuite/affine/std';
import { css, html, nothing } from 'lit';
import { property, state } from 'lit/decorators.js';

import { AIProvider } from '../../blocksuite/ai/provider';
import type { ChatContextValue } from './chat-context';
import { LanggraphChatMessages } from './langgraph-chat-messages';
import { LanggraphChatInput } from './langgraph-chat-input';
import { LanggraphProviderSelector } from './langgraph-provider-selector';

/**
 * Main chat panel component for Langgraph AI sessions
 */
export class LanggraphChatPanel extends WithDisposable(ShadowlessElement) {
  static override styles = css`
    .langgraph-chat-panel {
      display: flex;
      flex-direction: column;
      height: 100%;
      width: 100%;
      background-color: var(--affine-background-primary-color);
      overflow: hidden;
    }

    .langgraph-chat-panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px;
      border-bottom: 1px solid var(--affine-border-color);
      flex-shrink: 0;
    }

    .langgraph-chat-panel-title {
      font-size: 18px;
      font-weight: 600;
      color: var(--affine-text-primary-color);
    }

    .langgraph-chat-panel-controls {
      display: flex;
      gap: 8px;
      align-items: center;
    }

    .langgraph-chat-panel-content {
      display: flex;
      flex-direction: column;
      flex-grow: 1;
      padding: 0 16px;
      overflow: hidden;
      position: relative;
    }

    .langgraph-chat-panel-messages {
      flex-grow: 1;
      overflow-y: auto;
      padding: 16px 0;
    }

    .langgraph-chat-panel-input-container {
      margin-bottom: 16px;
      flex-shrink: 0;
    }
  `;

  @property({ attribute: false })
  accessor sessionTitle: string = 'AI Assistant';

  @property({ attribute: false })
  accessor providerOptions: {
    id: string;
    name: string;
    icon?: string;
  }[] = [
    { id: 'openai', name: 'OpenAI' },
    { id: 'perplexity', name: 'Perplexity' },
    { id: 'google', name: 'Google Gemini' },
    { id: 'fal', name: 'FAL AI' }
  ];

  @state()
  accessor selectedProvider: string = 'openai';

  @state()
  accessor chatContextValue: ChatContextValue = {
    messages: [],
    status: 'idle',
    error: null,
    quote: '',
    markdown: '',
    images: [],
    abortController: null
  };

  @state()
  accessor avatarUrl: string = '';

  @property({ attribute: false })
  accessor sessionId?: string;

  async createSessionId() {
    if (this.sessionId) return this.sessionId;
    
    try {
      // Call the backend to create a new session
      const response = await fetch('/api/ai/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          provider: this.selectedProvider
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to create session');
      }
      
      const data = await response.json();
      this.sessionId = data.sessionId;
      return this.sessionId;
    } catch (error) {
      console.error('Error creating session:', error);
      return undefined;
    }
  }

  async getSessionId() {
    return this.sessionId;
  }

  updateContext(context: Partial<ChatContextValue>) {
    this.chatContextValue = {
      ...this.chatContextValue,
      ...context
    };
  }

  onProviderChange(provider: string) {
    this.selectedProvider = provider;
    // Clear session when changing providers
    this.sessionId = undefined;
  }

  override connectedCallback() {
    super.connectedCallback();
    const { disposables } = this;

    // Fetch user info for avatar
    Promise.resolve(AIProvider.userInfo)
      .then(res => {
        this.avatarUrl = res?.avatarUrl ?? '';
      })
      .catch(console.error);

    // Subscribe to user info changes
    disposables.add(
      AIProvider.slots.userInfo.subscribe(userInfo => {
        this.avatarUrl = userInfo?.avatarUrl ?? '';
      })
    );
  }

  protected override render() {
    return html`
      <div class="langgraph-chat-panel">
        <div class="langgraph-chat-panel-header">
          <div class="langgraph-chat-panel-title">${this.sessionTitle}</div>
          <div class="langgraph-chat-panel-controls">
            <langgraph-provider-selector
              .providers=${this.providerOptions}
              .selectedProvider=${this.selectedProvider}
              @provider-change=${(e: CustomEvent) => this.onProviderChange(e.detail)}
            ></langgraph-provider-selector>
          </div>
        </div>
        <div class="langgraph-chat-panel-content">
          <langgraph-chat-messages
            class="langgraph-chat-panel-messages"
            .chatContextValue=${this.chatContextValue}
            .isLoading=${this.chatContextValue.status === 'loading'}
            .getSessionId=${() => this.getSessionId()}
            .createSessionId=${() => this.createSessionId()}
            .updateContext=${(context: Partial<ChatContextValue>) => this.updateContext(context)}
          ></langgraph-chat-messages>
          <div class="langgraph-chat-panel-input-container">
            <langgraph-chat-input
              .chatContextValue=${this.chatContextValue}
              .getSessionId=${() => this.getSessionId()}
              .createSessionId=${() => this.createSessionId()}
              .updateContext=${(context: Partial<ChatContextValue>) => this.updateContext(context)}
              .providerType=${this.selectedProvider}
            ></langgraph-chat-input>
          </div>
        </div>
      </div>
    `;
  }
}

customElements.define('langgraph-chat-panel', LanggraphChatPanel);

declare global {
  interface HTMLElementTagNameMap {
    'langgraph-chat-panel': LanggraphChatPanel;
  }
}