import { ShadowlessElement } from '@blocksuite/affine/std';
import { ChevronDownIcon } from '@blocksuite/icons/lit';
import { css, html, nothing } from 'lit';
import { property, state } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';

/**
 * Provider selector component for Langgraph AI sessions
 */
export class LanggraphProviderSelector extends ShadowlessElement {
  static override styles = css`
    .provider-selector {
      position: relative;
      user-select: none;
    }

    .provider-selector-trigger {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 4px 8px;
      border-radius: 4px;
      background-color: var(--affine-background-secondary-color);
      cursor: pointer;
      border: 1px solid var(--affine-border-color);
      font-size: 14px;
      color: var(--affine-text-primary-color);
    }

    .provider-selector-trigger:hover {
      background-color: var(--affine-hover-color);
    }

    .provider-selector-trigger-text {
      font-weight: 500;
    }

    .provider-selector-trigger-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--affine-text-secondary-color);
      font-size: 12px;
    }

    .provider-selector-dropdown {
      position: absolute;
      top: 100%;
      right: 0;
      margin-top: 4px;
      min-width: 160px;
      background-color: var(--affine-background-primary-color);
      border-radius: 8px;
      border: 1px solid var(--affine-border-color);
      box-shadow: var(--affine-shadow-2);
      z-index: 1000;
      max-height: 320px;
      overflow-y: auto;
      padding: 4px;
    }

    .provider-option {
      padding: 8px 12px;
      cursor: pointer;
      border-radius: 4px;
      font-size: 14px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .provider-option:hover {
      background-color: var(--affine-hover-color);
    }

    .provider-option[data-selected="true"] {
      background-color: var(--affine-hover-color);
      color: var(--affine-primary-color);
      font-weight: 500;
    }

    .provider-icon {
      width: 16px;
      height: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--affine-text-secondary-color);
      flex-shrink: 0;
    }

    .provider-name {
      flex-grow: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  `;

  @property({ attribute: false })
  accessor providers: Array<{
    id: string;
    name: string;
    icon?: string;
  }> = [];

  @property({ attribute: false })
  accessor selectedProvider: string = '';

  @state()
  accessor isOpen = false;

  private getProviderById(id: string) {
    return this.providers.find(provider => provider.id === id);
  }

  private handleToggleDropdown() {
    this.isOpen = !this.isOpen;
  }

  private handleClickOutside = (e: MouseEvent) => {
    if (this.isOpen && !this.contains(e.target as Node)) {
      this.isOpen = false;
    }
  };

  private handleSelectProvider(id: string) {
    if (id !== this.selectedProvider) {
      this.selectedProvider = id;
      this.dispatchEvent(new CustomEvent('provider-change', {
        detail: id,
        bubbles: true,
        composed: true
      }));
    }
    this.isOpen = false;
  }

  override connectedCallback() {
    super.connectedCallback();
    document.addEventListener('click', this.handleClickOutside);
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('click', this.handleClickOutside);
  }

  getProviderIcon(provider: {id: string, name: string, icon?: string}) {
    if (provider.icon) {
      return html`<div class="provider-icon" dangerouslySetInnerHTML=${provider.icon}></div>`;
    }
    
    // Default icons based on provider ID
    switch (provider.id) {
      case 'openai':
        return html`<div class="provider-icon">🧠</div>`;
      case 'perplexity':
        return html`<div class="provider-icon">🔍</div>`;
      case 'google':
        return html`<div class="provider-icon">🌐</div>`;
      case 'fal':
        return html`<div class="provider-icon">🖼️</div>`;
      default:
        return html`<div class="provider-icon">🤖</div>`;
    }
  }

  protected override render() {
    const selectedProvider = this.getProviderById(this.selectedProvider) || this.providers[0];
    
    return html`
      <div class="provider-selector" data-testid="provider-selector">
        <div 
          class="provider-selector-trigger" 
          @click=${this.handleToggleDropdown}
          data-testid="provider-selector-trigger"
        >
          <span class="provider-selector-trigger-text">
            ${selectedProvider?.name || 'Select Provider'}
          </span>
          <span class="provider-selector-trigger-icon">
            ${ChevronDownIcon()}
          </span>
        </div>
        
        ${this.isOpen ? html`
          <div class="provider-selector-dropdown" data-testid="provider-selector-dropdown">
            ${repeat(
              this.providers,
              provider => provider.id,
              provider => html`
                <div 
                  class="provider-option" 
                  data-selected=${provider.id === this.selectedProvider}
                  @click=${() => this.handleSelectProvider(provider.id)}
                  data-testid="provider-option-${provider.id}"
                >
                  ${this.getProviderIcon(provider)}
                  <span class="provider-name">${provider.name}</span>
                </div>
              `
            )}
          </div>
        ` : nothing}
      </div>
    `;
  }
}

customElements.define('langgraph-provider-selector', LanggraphProviderSelector);

declare global {
  interface HTMLElementTagNameMap {
    'langgraph-provider-selector': LanggraphProviderSelector;
  }
}