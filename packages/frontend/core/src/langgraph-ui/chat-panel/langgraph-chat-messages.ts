import { WithDisposable } from '@blocksuite/affine/global/lit';
import { ShadowlessElement } from '@blocksuite/affine/std';
import { ArrowDownBigIcon as ArrowDownIcon } from '@blocksuite/icons/lit';
import { css, html, nothing } from 'lit';
import { property, query, state } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';
import { debounce } from 'lodash-es';

import { AffineIcon } from '../../blocksuite/ai/_common/icons';
import type { ChatMessage, ChatAction } from '../../blocksuite/ai/components/ai-chat-messages';
import type { AIError } from '../../blocksuite/ai/provider';
import type { ChatContextValue } from './chat-context';

/**
 * Chat messages component for Langgraph AI sessions
 */
export class LanggraphChatMessages extends WithDisposable(ShadowlessElement) {
  static override styles = css`
    .langgraph-chat-messages-container {
      display: flex;
      flex-direction: column;
      gap: 24px;
      height: 100%;
      position: relative;
      overflow-y: auto;
    }

    .message {
      display: flex;
      gap: 12px;
      padding: 8px 12px;
      border-radius: 8px;
      animation: fade-in 0.3s ease-in-out;
    }

    @keyframes fade-in {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .message.user {
      background-color: var(--affine-background-secondary-color);
      align-self: flex-end;
      max-width: 85%;
    }

    .message.assistant {
      background-color: var(--affine-background-primary-color);
      border: 1px solid var(--affine-border-color);
      align-self: flex-start;
      max-width: 85%;
    }

    .message-avatar {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background-color: var(--affine-primary-color);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 600;
      font-size: 14px;
      flex-shrink: 0;
    }

    .message-avatar.user {
      background-color: var(--affine-primary-color);
    }

    .message-avatar.assistant {
      background-color: #5E6AD2;
    }

    .message-content {
      display: flex;
      flex-direction: column;
      gap: 4px;
      overflow-wrap: break-word;
      word-break: break-word;
    }

    .message-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 12px;
      color: var(--affine-text-secondary-color);
    }

    .message-role {
      font-weight: 600;
      color: var(--affine-text-primary-color);
    }

    .message-timestamp {
      font-size: 10px;
    }

    .message-text {
      font-size: 14px;
      line-height: 1.5;
      white-space: pre-wrap;
    }

    .message-text code {
      font-family: monospace;
      background-color: var(--affine-code-background);
      padding: 2px 4px;
      border-radius: 4px;
    }

    .message-text pre {
      background-color: var(--affine-code-background);
      padding: 12px;
      border-radius: 8px;
      overflow-x: auto;
      font-family: monospace;
      font-size: 12px;
      margin: 8px 0;
    }

    .message-text img {
      max-width: 100%;
      border-radius: 8px;
      margin: 8px 0;
    }

    .message-actions {
      display: flex;
      gap: 8px;
      margin-top: 8px;
    }

    .message-action-button {
      font-size: 12px;
      padding: 4px 8px;
      border-radius: 4px;
      background-color: var(--affine-background-tertiary-color);
      border: 1px solid var(--affine-border-color);
      cursor: pointer;
    }

    .message-action-button:hover {
      background-color: var(--affine-hover-color);
    }

    .loading-indicator {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      color: var(--affine-text-secondary-color);
      padding: 8px;
    }

    .typing-animation {
      display: flex;
      gap: 4px;
      align-items: center;
      padding-left: 4px;
    }

    .typing-dot {
      width: 6px;
      height: 6px;
      background-color: var(--affine-text-secondary-color);
      border-radius: 50%;
      animation: typing-animation 1.4s infinite ease-in-out;
    }

    .typing-dot:nth-child(1) {
      animation-delay: 0s;
    }

    .typing-dot:nth-child(2) {
      animation-delay: 0.2s;
    }

    .typing-dot:nth-child(3) {
      animation-delay: 0.4s;
    }

    @keyframes typing-animation {
      0%, 100% {
        transform: translateY(0);
      }
      50% {
        transform: translateY(-5px);
      }
    }

    .error-message {
      color: var(--affine-error-color);
      font-size: 14px;
      margin-top: 8px;
      padding: 8px;
      border-radius: 4px;
      background-color: var(--affine-error-background);
    }

    .messages-placeholder {
      width: 100%;
      position: absolute;
      z-index: 1;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
    }

    .messages-placeholder-title {
      font-size: 18px;
      font-weight: 600;
      color: var(--affine-text-primary-color);
    }

    .messages-placeholder-title[data-loading='true'] {
      font-size: var(--affine-font-sm);
      color: var(--affine-text-secondary-color);
    }

    .down-indicator {
      position: absolute;
      left: 50%;
      transform: translate(-50%, 0);
      bottom: 24px;
      z-index: 1;
      border-radius: 50%;
      width: 32px;
      height: 32px;
      border: 0.5px solid var(--affine-border-color);
      background-color: var(--affine-background-primary-color);
      box-shadow: var(--affine-shadow-2);
      display: flex;
      justify-content: center;
      align-items: center;
      cursor: pointer;
    }

    .onboarding-wrapper {
      display: flex;
      gap: 8px;
      flex-direction: column;
      margin-top: 16px;
    }

    .onboarding-item {
      display: flex;
      height: 28px;
      padding: 4px 12px;
      gap: 8px;
      align-items: center;
      justify-content: start;
      cursor: pointer;
      border-radius: 4px;
      background-color: var(--affine-background-primary-color);
      border: 1px solid var(--affine-border-color);
    }

    .onboarding-item:hover {
      background-color: var(--affine-hover-color);
    }

    .onboarding-item-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      color: var(--affine-text-secondary-color);
    }

    .onboarding-item-text {
      font-size: var(--affine-font-xs);
      font-weight: 400;
      color: var(--affine-text-primary-color);
      white-space: nowrap;
    }
  `;

  @property({ attribute: false })
  accessor isLoading!: boolean;

  @property({ attribute: false })
  accessor chatContextValue!: ChatContextValue;

  @property({ attribute: false })
  accessor getSessionId!: () => Promise<string | undefined>;

  @property({ attribute: false })
  accessor createSessionId!: () => Promise<string | undefined>;

  @property({ attribute: false })
  accessor updateContext!: (context: Partial<ChatContextValue>) => void;

  @query('.langgraph-chat-messages-container')
  accessor messagesContainer: HTMLDivElement | null = null;

  @state()
  accessor canScrollDown = false;

  @property({
    type: String,
    attribute: 'data-testid',
    reflect: true,
  })
  accessor testId = 'langgraph-chat-messages';

  override connectedCallback() {
    super.connectedCallback();
  }

  getScrollContainer(): HTMLDivElement | null {
    return this.messagesContainer;
  }

  // Example onboarding prompts
  private readonly onboardingItems = [
    {
      icon: '✍️',
      text: 'Explain a complex concept',
      handler: () => this.triggerOnboarding('Explain quantum computing in simple terms'),
    },
    {
      icon: '💻',
      text: 'Help with code',
      handler: () => this.triggerOnboarding('Write a React component that shows a countdown timer'),
    },
    {
      icon: '🔍',
      text: 'Research a topic',
      handler: () => this.triggerOnboarding('What are the latest advancements in renewable energy?'),
    },
    {
      icon: '🖼️',
      text: 'Generate an image',
      handler: () => this.triggerOnboarding('Generate an image of a futuristic city with flying cars'),
    },
  ];

  private triggerOnboarding(prompt: string) {
    // Simulate sending the message through the chat input
    const event = new CustomEvent('onboarding-prompt', {
      detail: { prompt },
      bubbles: true,
      composed: true,
    });
    this.dispatchEvent(event);
  }

  private _renderOnboarding() {
    return this.isLoading ? nothing : html`
      <div class="onboarding-wrapper" data-testid="ai-onboarding">
        ${repeat(
          this.onboardingItems,
          item => item.text,
          item => html`
            <div
              @click=${() => item.handler()}
              class="onboarding-item"
            >
              <div class="onboarding-item-icon">${item.icon}</div>
              <div class="onboarding-item-text">${item.text}</div>
            </div>
          `
        )}
      </div>
    `;
  }

  private readonly _onScroll = () => {
    if (!this.messagesContainer) return;
    const { clientHeight, scrollTop, scrollHeight } = this.messagesContainer;
    this.canScrollDown = scrollHeight - scrollTop - clientHeight > 200;
  };

  private readonly _debouncedOnScroll = debounce(
    this._onScroll.bind(this),
    100
  );

  private readonly _onDownIndicatorClick = () => {
    this.canScrollDown = false;
    this.scrollToEnd();
  };

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  scrollToEnd() {
    requestAnimationFrame(() => {
      if (!this.messagesContainer) return;
      this.messagesContainer.scrollTo({
        top: this.messagesContainer.scrollHeight,
        behavior: 'smooth',
      });
    });
  }

  protected override render() {
    const { messages, status, error } = this.chatContextValue;
    const { isLoading } = this;
    const filteredMessages = messages.filter(item => 'role' in item) as ChatMessage[];
    
    const showDownIndicator =
      this.canScrollDown &&
      filteredMessages.length > 0 &&
      status !== 'transmitting';

    return html`
      <div
        class="langgraph-chat-messages-container"
        data-testid="langgraph-chat-messages-container"
        @scroll=${() => this._debouncedOnScroll()}
      >
        ${filteredMessages.length === 0
          ? html`<div
              class="messages-placeholder"
              data-testid="langgraph-chat-messages-placeholder"
            >
              ${AffineIcon(
                isLoading
                  ? 'var(--affine-icon-secondary)'
                  : 'var(--affine-primary-color)'
              )}
              <div class="messages-placeholder-title" data-loading=${isLoading}>
                ${isLoading
                  ? html`<span data-testid="chat-panel-loading-state">Loading conversation history...</span>`
                  : html`<span data-testid="chat-panel-empty-state">What can I help you with?</span>`
                }
              </div>
              ${this._renderOnboarding()}
            </div>`
          : repeat(
              filteredMessages,
              (message, index) => index,
              (message, index) => {
                const isLast = index === filteredMessages.length - 1;
                return html`
                  <div class="message ${message.role}">
                    <div class="message-avatar ${message.role}">
                      ${message.role === 'user' ? 'U' : 'A'}
                    </div>
                    <div class="message-content">
                      <div class="message-header">
                        <span class="message-role">${message.role === 'user' ? 'You' : 'Assistant'}</span>
                        <span class="message-timestamp">${this.formatDate(message.createdAt)}</span>
                      </div>
                      <div class="message-text">${message.content}</div>
                      
                      ${message.role === 'assistant' && isLast && status === 'error' && error
                        ? html`<div class="error-message">
                            ${error.message || 'An error occurred while generating a response.'}
                            <div class="message-actions">
                              <button class="message-action-button" @click=${() => this.retry()}>
                                Retry
                              </button>
                            </div>
                          </div>`
                        : nothing
                      }
                      
                      ${message.role === 'assistant' && isLast && status === 'transmitting'
                        ? html`<div class="typing-animation">
                            <div class="typing-dot"></div>
                            <div class="typing-dot"></div>
                            <div class="typing-dot"></div>
                          </div>`
                        : nothing
                      }
                      
                      ${message.role === 'assistant' && message.content
                        ? html`<div class="message-actions">
                            <button class="message-action-button" @click=${() => this.copyToClipboard(message.content)}>
                              Copy
                            </button>
                          </div>`
                        : nothing
                      }
                    </div>
                  </div>
                `;
              }
            )
        }
        
        ${status === 'loading' && filteredMessages.length > 0
          ? html`<div class="loading-indicator">
              <div class="typing-animation">
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
              </div>
              <span>Loading...</span>
            </div>`
          : nothing
        }
      </div>
      
      ${showDownIndicator
        ? html`<div
            data-testid="chat-panel-scroll-down-indicator"
            class="down-indicator"
            @click=${this._onDownIndicatorClick}
          >
            ${ArrowDownIcon()}
          </div>`
        : nothing
      }
    `;
  }

  async copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      // Could show a toast notification here
    } catch (error) {
      console.error('Failed to copy text:', error);
    }
  }

  async retry() {
    try {
      const sessionId = await this.createSessionId();
      if (!sessionId) return;
      
      // Clear the current error and set status to loading
      this.updateContext({ status: 'loading', error: null });
      
      // Prepare for retry by removing the last assistant message content
      const messages = [...this.chatContextValue.messages];
      const last = messages[messages.length - 1] as ChatMessage;
      if (last.role === 'assistant') {
        last.content = '';
        last.createdAt = new Date().toISOString();
      }
      
      this.updateContext({ messages });
      
      // Call the AI endpoint to retry the generation
      const response = await fetch(`/api/ai/chat/${sessionId}/retry`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to retry message generation');
      }
      
      const reader = response.body?.getReader();
      if (!reader) throw new Error('Failed to get response stream');
      
      // Set status to transmitting while streaming
      this.updateContext({ status: 'transmitting' });
      
      // Process the streamed response
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        // Decode the streamed chunk
        const text = new TextDecoder().decode(value);
        
        // Update the message with the new content
        const messages = [...this.chatContextValue.messages];
        const last = messages[messages.length - 1] as ChatMessage;
        last.content += text;
        this.updateContext({ messages });
      }
      
      // Set status to success when complete
      this.updateContext({ status: 'success' });
    } catch (error) {
      console.error('Error retrying:', error);
      this.updateContext({ 
        status: 'error', 
        error: { 
          message: error instanceof Error ? error.message : 'An error occurred during retry'
        } as AIError 
      });
    }
  }
}

customElements.define('langgraph-chat-messages', LanggraphChatMessages);

declare global {
  interface HTMLElementTagNameMap {
    'langgraph-chat-messages': LanggraphChatMessages;
  }
}