import { stopPropagation } from '@affine/core/utils';
import { WithDisposable } from '@blocksuite/affine/global/lit';
import { openFileOrFiles } from '@blocksuite/affine/shared/utils';
import { ShadowlessElement } from '@blocksuite/affine/std';
import {
  CloseIcon,
  ImageIcon,
  ThinkingIcon,
  PublishIcon,
} from '@blocksuite/icons/lit';
import { css, html, nothing } from 'lit';
import { property, query, state } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';
import { styleMap } from 'lit/directives/style-map.js';

import { ChatAbortIcon, ChatSendIcon } from '../../blocksuite/ai/_common/icons';
import type { ChatMessage } from '../../blocksuite/ai/components/ai-chat-messages';
import type { AIError } from '../../blocksuite/ai/provider';
import { readBlobAsURL } from '../../blocksuite/ai/utils/image';
import type { ChatContextValue } from './chat-context';

const MAX_IMAGE_COUNT = 4;

/**
 * Chat input component for Langgraph AI sessions
 */
export class LanggraphChatInput extends WithDisposable(ShadowlessElement) {
  static override styles = css`
    :host {
      width: 100%;
    }
    
    .chat-panel-input {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 12px;
      position: relative;
      margin-top: 12px;
      border-radius: 4px;
      padding: 8px;
      min-height: 94px;
      box-sizing: border-box;
      border-width: 1px;
      border-style: solid;
      border-color: var(--affine-border-color);
    }

    .chat-panel-input[data-if-focused='true'] {
      border-color: var(--affine-primary-color);
      box-shadow: var(--affine-active-shadow);
      user-select: none;
    }

    .chat-selection-quote {
      padding: 4px 0px 8px 0px;
      padding-left: 15px;
      max-height: 56px;
      font-size: 14px;
      font-weight: 400;
      line-height: 22px;
      color: var(--affine-text-secondary-color);
      position: relative;
    }

    .chat-selection-quote div {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .chat-selection-quote .chat-quote-close {
      position: absolute;
      right: 0;
      top: 0;
      cursor: pointer;
      display: none;
      width: 16px;
      height: 16px;
      border-radius: 4px;
      border: 1px solid var(--affine-border-color);
      background-color: var(--affine-white);
    }

    .chat-selection-quote:hover .chat-quote-close {
      display: flex;
      justify-content: center;
      align-items: center;
    }

    .chat-selection-quote::after {
      content: '';
      width: 2px;
      height: calc(100% - 10px);
      margin-top: 5px;
      position: absolute;
      left: 0;
      top: 0;
      background: var(--affine-quote-color);
      border-radius: 18px;
    }

    .chat-panel-input textarea {
      width: 100%;
      padding: 0;
      margin: 0;
      border: none;
      line-height: 22px;
      font-size: var(--affine-font-sm);
      font-weight: 400;
      font-family: var(--affine-font-family);
      color: var(--affine-text-primary-color);
      box-sizing: border-box;
      resize: none;
      overflow-y: hidden;
      background-color: transparent;
    }

    .chat-panel-input textarea::placeholder {
      font-size: 14px;
      font-weight: 400;
      font-family: var(--affine-font-family);
      color: var(--affine-placeholder-color);
    }

    .chat-panel-input textarea:focus {
      outline: none;
    }

    .chat-panel-input-actions {
      display: flex;
      gap: 8px;
      align-items: center;
    }

    .chat-input-icon {
      cursor: pointer;
      padding: 2px;
      display: flex;
      justify-content: center;
      align-items: center;
      border-radius: 4px;
    }

    .chat-input-icon svg {
      width: 20px;
      height: 20px;
      color: var(--affine-icon-primary);
    }

    .chat-input-icon .chat-input-icon-label {
      font-size: 14px;
      line-height: 22px;
      font-weight: 500;
      color: var(--affine-icon-primary);
      margin: 0 4px 0 4px;
    }

    .chat-input-icon:nth-child(2) {
      margin-left: auto;
    }

    .chat-input-icon:hover {
      background-color: var(--affine-hover-color);
    }

    .chat-input-icon[data-active='true'] {
      background-color: #1e96eb14;
    }

    .chat-input-icon[data-active='true'] svg {
      color: var(--affine-icon-activated);
    }

    .chat-input-icon[data-active='true'] .chat-input-icon-label {
      color: var(--affine-icon-activated);
    }

    .chat-input-icon[aria-disabled='true'] {
      cursor: not-allowed;
    }

    .chat-input-icon[aria-disabled='true'] svg {
      color: var(--affine-icon-secondary) !important;
    }

    .chat-panel-send svg rect {
      fill: var(--affine-primary-color);
    }

    .chat-panel-send[aria-disabled='true'] {
      cursor: not-allowed;
    }

    .chat-panel-send[aria-disabled='true'] svg rect {
      fill: var(--affine-text-disable-color);
    }

    .image-preview-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
      gap: 8px;
      margin-bottom: 8px;
    }

    .image-preview-item {
      position: relative;
      width: 100%;
      aspect-ratio: 1;
      border-radius: 4px;
      overflow: hidden;
    }

    .image-preview-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      border-radius: 4px;
    }

    .image-preview-remove {
      position: absolute;
      top: 4px;
      right: 4px;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background-color: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      color: white;
    }
  `;

  @query('textarea')
  accessor textarea!: HTMLTextAreaElement;

  @state()
  accessor isInputEmpty = true;

  @state()
  accessor focused = false;

  @property({ attribute: false })
  accessor chatContextValue!: ChatContextValue;

  @property({ attribute: false })
  accessor getSessionId!: () => Promise<string | undefined>;

  @property({ attribute: false })
  accessor createSessionId!: () => Promise<string | undefined>;

  @property({ attribute: false })
  accessor updateContext!: (context: Partial<ChatContextValue>) => void;

  @property({ attribute: false })
  accessor providerType: string = 'openai';

  @property({ attribute: false })
  accessor networkSearchEnabled: boolean = false;

  @property({ attribute: false })
  accessor reasoningEnabled: boolean = false;

  @property({
    type: String,
    attribute: 'data-testid',
    reflect: true,
  })
  accessor testId = 'langgraph-chat-input-container';

  private get _isImageUploadDisabled() {
    return this.chatContextValue.images.length >= MAX_IMAGE_COUNT;
  }

  override connectedCallback() {
    super.connectedCallback();

    // Listen for onboarding prompt events
    this._disposables.add(
      this.addEventListener('onboarding-prompt', (e: any) => {
        if (e.detail?.prompt) {
          this.textarea.value = e.detail.prompt;
          this._handleInput();
          this._onTextareaSend(new Event('click'));
        }
      })
    );
  }

  protected override render() {
    const { images, status, quote } = this.chatContextValue;
    const hasImages = images.length > 0;
    const maxHeight = hasImages ? 272 + 2 : 200 + 2;

    return html`
      <div
        class="chat-panel-input"
        data-if-focused=${this.focused}
        style=${styleMap({
          maxHeight: `${maxHeight}px !important`,
        })}
        @pointerdown=${this._handlePointerDown}
      >
        ${hasImages
          ? html`
              <div class="image-preview-grid">
                ${repeat(
                  images,
                  (_, i) => i,
                  (image, index) => {
                    const url = URL.createObjectURL(image);
                    return html`
                      <div class="image-preview-item">
                        <img class="image-preview-img" src=${url} alt="Preview" />
                        <div 
                          class="image-preview-remove" 
                          @click=${() => this._handleImageRemove(index)}
                        >
                          ${CloseIcon()}
                        </div>
                      </div>
                    `;
                  }
                )}
              </div>
            `
          : nothing}

        ${quote
          ? html`<div
              class="chat-selection-quote"
              data-testid="chat-selection-quote"
            >
              ${repeat(
                quote.split('\n').slice(0, 2),
                line => line,
                line => html`<div>${line}</div>`
              )}
              <div
                class="chat-quote-close"
                @click=${() => {
                  this.updateContext({ quote: '', markdown: '' });
                }}
              >
                ${CloseIcon()}
              </div>
            </div>`
          : nothing}

        <textarea
          rows="1"
          placeholder="Ask me anything..."
          @input=${this._handleInput}
          @keydown=${this._handleKeyDown}
          @focus=${() => {
            this.focused = true;
          }}
          @blur=${() => {
            this.focused = false;
          }}
          @paste=${this._handlePaste}
          data-testid="chat-panel-input"
        ></textarea>

        <div class="chat-panel-input-actions">
          <div
            class="chat-input-icon"
            data-testid="chat-panel-input-image-upload"
            aria-disabled=${this._isImageUploadDisabled}
            @click=${this._uploadImageFiles}
          >
            ${ImageIcon()}
            <div class="tooltip">Upload</div>
          </div>

          <div
            class="chat-input-icon"
            data-testid="chat-network-search"
            data-active=${this.networkSearchEnabled}
            @click=${this._toggleNetworkSearch}
            @pointerdown=${stopPropagation}
          >
            ${PublishIcon()}
            <span class="chat-input-icon-label">Search</span>
          </div>

          <div
            class="chat-input-icon"
            data-testid="chat-reasoning"
            data-active=${this.reasoningEnabled}
            @click=${this._toggleReasoning}
            @pointerdown=${stopPropagation}
          >
            ${ThinkingIcon()}
            <span class="chat-input-icon-label">Reason</span>
          </div>

          ${status === 'transmitting'
            ? html`<div @click=${this._handleAbort} data-testid="chat-panel-stop" class="chat-panel-send">
                ${ChatAbortIcon}
              </div>`
            : html`<div
                @click="${this._onTextareaSend}"
                class="chat-panel-send"
                aria-disabled=${this.isInputEmpty}
                data-testid="chat-panel-send"
              >
                ${ChatSendIcon}
              </div>`}
        </div>
      </div>
    `;
  }

  private readonly _handlePointerDown = (e: MouseEvent) => {
    if (e.target !== this.textarea) {
      // by default the div will be focused and will blur the textarea
      e.preventDefault();
      this.textarea.focus();
    }
  };

  private readonly _handleInput = () => {
    const { textarea } = this;
    this.isInputEmpty = !textarea.value.trim();
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
    
    // Calculate maximum height including images
    let imagesHeight = 0;
    if (this.chatContextValue.images.length > 0) {
      imagesHeight = 120; // Approximate height of the image grid
    }
    
    if (this.scrollHeight >= 200 + imagesHeight) {
      textarea.style.height = '148px';
      textarea.style.overflowY = 'scroll';
    }
  };

  private readonly _handleKeyDown = async (evt: KeyboardEvent) => {
    if (evt.key === 'Enter' && !evt.shiftKey && !evt.isComposing) {
      await this._onTextareaSend(evt);
    }
  };

  private readonly _handlePaste = (event: ClipboardEvent) => {
    const items = event.clipboardData?.items;
    if (!items) return;

    for (const index in items) {
      const item = items[index];
      if (item.kind === 'file' && item.type.indexOf('image') >= 0) {
        const blob = item.getAsFile();
        if (!blob) continue;
        this._addImages([blob]);
      }
    }
  };

  private readonly _handleAbort = () => {
    this.chatContextValue.abortController?.abort();
    this.updateContext({ status: 'success' });
  };

  private readonly _toggleNetworkSearch = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    this.networkSearchEnabled = !this.networkSearchEnabled;
  };

  private readonly _toggleReasoning = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    this.reasoningEnabled = !this.reasoningEnabled;
  };

  private readonly _handleImageRemove = (index: number) => {
    const oldImages = this.chatContextValue.images;
    const newImages = oldImages.filter((_, i) => i !== index);
    this.updateContext({ images: newImages });
  };

  private readonly _addImages = (files: File[]) => {
    const currentCount = this.chatContextValue.images.length;
    const remainingSlots = MAX_IMAGE_COUNT - currentCount;
    
    if (remainingSlots <= 0) return;
    
    const newImages = files.slice(0, remainingSlots);
    this.updateContext({
      images: [...this.chatContextValue.images, ...newImages]
    });
  };

  private readonly _uploadImageFiles = async (_e: MouseEvent) => {
    if (this._isImageUploadDisabled) return;

    const images = await openFileOrFiles({
      acceptType: 'Images',
      multiple: true,
    });
    
    if (!images) return;
    this._addImages(images);
  };

  private readonly _onTextareaSend = async (e: MouseEvent | KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const value = this.textarea.value.trim();
    if (value.length === 0) return;

    this.textarea.value = '';
    this.isInputEmpty = true;
    this.textarea.style.height = 'unset';

    await this.send(value);
  };

  send = async (text: string) => {
    try {
      const { status, markdown, images } = this.chatContextValue;
      if (status === 'loading' || status === 'transmitting') return;
      if (!text) return;

      const abortController = new AbortController();
      this.updateContext({
        status: 'loading',
        error: null,
        quote: '',
        markdown: '',
        abortController,
      });

      // Convert images to data URLs for sending
      const attachments = await Promise.all(
        images.map(image => readBlobAsURL(image))
      );
      
      // Combine markdown and text if markdown is provided
      const userInput = (markdown ? `${markdown}\n` : '') + text;

      // Add user message to chat
      await this._preUpdateMessages(userInput, attachments);

      // Create or get session ID
      const sessionId = await this.createSessionId();
      if (!sessionId) {
        throw new Error('Failed to create session');
      }

      // Send the message to the backend
      const response = await fetch(`/api/ai/chat/${sessionId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userInput,
          attachments,
          provider: this.providerType,
          networkSearch: this.networkSearchEnabled,
          reasoning: this.reasoningEnabled,
          signal: abortController.signal,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      if (!reader) throw new Error('Failed to get response stream');

      // Set status to transmitting for streaming UI
      this.updateContext({ status: 'transmitting' });

      // Process the streamed response
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        // Decode the streamed chunk
        const text = new TextDecoder().decode(value);
        
        // Update the messages with streaming content
        const messages = [...this.chatContextValue.messages];
        const last = messages[messages.length - 1] as ChatMessage;
        last.content += text;
        this.updateContext({ messages, status: 'transmitting' });
      }

      // Clear images after successful send
      this.updateContext({ 
        status: 'success',
        images: [] 
      });
      
    } catch (error) {
      console.error('Error sending message:', error);
      this.updateContext({ 
        status: 'error', 
        error: { 
          message: error instanceof Error ? error.message : 'An error occurred'
        } as AIError 
      });
    } finally {
      this.updateContext({ abortController: null });
    }
  };

  private readonly _preUpdateMessages = async (
    userInput: string,
    attachments: string[]
  ) => {
    // Add optimistic user message
    const userMessage: ChatMessage = {
      id: '',
      role: 'user',
      content: userInput,
      createdAt: new Date().toISOString(),
      attachments,
    };
    
    // Add empty assistant message placeholder
    const assistantMessage: ChatMessage = {
      id: '',
      role: 'assistant',
      content: '',
      createdAt: new Date().toISOString(),
    };
    
    this.updateContext({
      messages: [
        ...this.chatContextValue.messages,
        userMessage,
        assistantMessage,
      ],
    });
  };
}

customElements.define('langgraph-chat-input', LanggraphChatInput);

declare global {
  interface HTMLElementTagNameMap {
    'langgraph-chat-input': LanggraphChatInput;
  }
}