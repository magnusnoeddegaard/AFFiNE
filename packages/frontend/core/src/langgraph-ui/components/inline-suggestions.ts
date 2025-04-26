import { WithDisposable } from '@blocksuite/affine/global/lit';
import { ShadowlessElement } from '@blocksuite/affine/std';
import type { EditorHost } from '@blocksuite/affine/std';
import { CheckIcon, CloseIcon } from '@blocksuite/icons/lit';
import { css, html, nothing } from 'lit';
import { property, state } from 'lit/decorators.js';

/**
 * Inline suggestions component that appears in the editor
 */
export class InlineSuggestions extends WithDisposable(ShadowlessElement) {
  static override styles = css`
    .inline-suggestions {
      position: relative;
      margin: 8px 0;
      color: var(--affine-text-secondary-color);
      font-size: 14px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .inline-suggestions-content {
      position: relative;
      border-radius: 8px;
      padding: 12px;
      margin-left: 16px;
      background-color: var(--affine-background-secondary-color);
      border-left: 3px solid var(--affine-primary-color);
      font-style: italic;
      line-height: 1.5;
      opacity: 0.9;
    }

    .inline-suggestions-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
      user-select: none;
    }

    .inline-suggestions-title {
      font-weight: 600;
      color: var(--affine-text-primary-color);
      font-style: normal;
    }

    .inline-suggestions-controls {
      position: absolute;
      top: 8px;
      right: 8px;
      display: flex;
      gap: 8px;
    }

    .inline-suggestion-button {
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      width: 24px;
      height: 24px;
      border-radius: 4px;
      color: var(--affine-icon-secondary);
    }

    .inline-suggestion-button:hover {
      background-color: var(--affine-hover-color);
      color: var(--affine-icon-primary);
    }

    .inline-suggestion-button.accept {
      color: var(--affine-success-color);
    }

    .inline-suggestion-button.accept:hover {
      background-color: rgba(var(--affine-success-color-rgb), 0.1);
    }

    .inline-suggestion-button.reject:hover {
      background-color: rgba(var(--affine-error-color-rgb), 0.1);
      color: var(--affine-error-color);
    }

    .inline-icon {
      font-size: 16px;
      color: var(--affine-primary-color);
      margin-right: 8px;
      flex-shrink: 0;
    }
  `;

  @property({ attribute: false })
  accessor host!: EditorHost;

  @property({ attribute: false })
  accessor suggestion: string = '';

  @property({ attribute: false })
  accessor onAccept?: (suggestion: string) => void;

  @property({ attribute: false })
  accessor onReject?: () => void;

  @property({ attribute: false })
  accessor title: string = 'AI Suggestion';

  @property({ attribute: false })
  accessor icon: string = '💡';

  private handleAccept() {
    if (this.onAccept) {
      this.onAccept(this.suggestion);
    }
  }

  private handleReject() {
    if (this.onReject) {
      this.onReject();
    }
  }

  protected override render() {
    if (!this.suggestion) return nothing;

    return html`
      <div class="inline-suggestions">
        <div class="inline-suggestions-content">
          <div class="inline-suggestions-header">
            <span class="inline-icon">${this.icon}</span>
            <span class="inline-suggestions-title">${this.title}</span>
          </div>
          <div class="inline-suggestions-controls">
            <div 
              class="inline-suggestion-button accept" 
              @click=${this.handleAccept}
              title="Accept suggestion"
            >
              ${CheckIcon()}
            </div>
            <div 
              class="inline-suggestion-button reject" 
              @click=${this.handleReject}
              title="Reject suggestion"
            >
              ${CloseIcon()}
            </div>
          </div>
          <div>${this.suggestion}</div>
        </div>
      </div>
    `;
  }
}

customElements.define('inline-suggestions', InlineSuggestions);

declare global {
  interface HTMLElementTagNameMap {
    'inline-suggestions': InlineSuggestions;
  }
}