import { WithDisposable } from '@blocksuite/affine/global/lit';
import { ShadowlessElement } from '@blocksuite/affine/std';
import { RemoveIcon } from '@blocksuite/icons/lit';
import { css, html, nothing } from 'lit';
import { property, state } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';

/**
 * Context source interface
 */
export interface ContextSource {
  id: string;
  type: 'document' | 'image' | 'file' | 'webpage' | 'search';
  title: string;
  content?: string;
  url?: string;
  preview?: string;
  active: boolean;
}

/**
 * Context panel component that displays and manages context sources
 */
export class ContextPanel extends WithDisposable(ShadowlessElement) {
  static override styles = css`
    .context-panel {
      display: flex;
      flex-direction: column;
      height: 100%;
      width: 100%;
      background-color: var(--affine-background-secondary-color);
      color: var(--affine-text-primary-color);
      padding: 16px;
      overflow-y: auto;
    }

    .context-panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }

    .context-panel-title {
      font-size: 16px;
      font-weight: 600;
    }

    .context-panel-toggle-all {
      color: var(--affine-primary-color);
      font-size: 14px;
      cursor: pointer;
      user-select: none;
    }
    
    .context-panel-toggle-all:hover {
      text-decoration: underline;
    }

    .context-panel-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 32px 16px;
      color: var(--affine-text-secondary-color);
      text-align: center;
      font-size: 14px;
    }

    .context-panel-empty-icon {
      font-size: 24px;
      margin-bottom: 16px;
      opacity: 0.6;
    }

    .context-source-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .context-source-item {
      display: flex;
      padding: 8px 12px;
      background-color: var(--affine-background-primary-color);
      border-radius: 8px;
      border: 1px solid var(--affine-border-color);
      position: relative;
    }

    .context-source-item[data-active="false"] {
      opacity: 0.6;
    }

    .context-source-content {
      flex-grow: 1;
      overflow: hidden;
    }

    .context-source-title {
      font-weight: 500;
      font-size: 14px;
      margin-bottom: 4px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .context-source-preview {
      font-size: 12px;
      color: var(--affine-text-secondary-color);
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .context-source-icon {
      flex-shrink: 0;
      width: 32px;
      height: 32px;
      border-radius: 4px;
      margin-right: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: var(--affine-hover-color);
      font-size: 16px;
    }

    .context-source-toggle {
      cursor: pointer;
      position: absolute;
      right: 8px;
      top: 8px;
      padding: 2px;
      border-radius: 4px;
      color: var(--affine-icon-secondary);
    }

    .context-source-toggle:hover {
      background-color: var(--affine-hover-color);
      color: var(--affine-icon-primary);
    }
  `;

  @property({ attribute: false })
  accessor sources: ContextSource[] = [];

  @property({ attribute: false })
  accessor onSourceToggle?: (source: ContextSource) => void;

  @property({ attribute: false })
  accessor onSourceRemove?: (sourceId: string) => void;

  @property({ attribute: false })
  accessor onToggleAll?: (active: boolean) => void;

  private getIconForType(type: ContextSource['type']) {
    switch (type) {
      case 'document':
        return '📄';
      case 'image':
        return '🖼️';
      case 'file':
        return '📁';
      case 'webpage':
        return '🌐';
      case 'search':
        return '🔍';
      default:
        return '📄';
    }
  }

  private handleToggleSource(source: ContextSource) {
    if (this.onSourceToggle) {
      this.onSourceToggle({
        ...source,
        active: !source.active
      });
    }
  }

  private handleRemoveSource(source: ContextSource, e: Event) {
    e.stopPropagation();
    if (this.onSourceRemove) {
      this.onSourceRemove(source.id);
    }
  }

  private handleToggleAll() {
    // Check if all sources are active
    const allActive = this.sources.every(source => source.active);
    if (this.onToggleAll) {
      this.onToggleAll(!allActive);
    }
  }

  protected override render() {
    const hasActiveSources = this.sources.some(source => source.active);
    const allActive = this.sources.every(source => source.active);
    
    return html`
      <div class="context-panel">
        <div class="context-panel-header">
          <div class="context-panel-title">Context Sources</div>
          ${this.sources.length > 0 ? html`
            <div class="context-panel-toggle-all" @click=${this.handleToggleAll}>
              ${allActive ? 'Disable All' : 'Enable All'}
            </div>
          ` : nothing}
        </div>
        
        ${this.sources.length === 0 ? html`
          <div class="context-panel-empty">
            <div class="context-panel-empty-icon">📚</div>
            <div>No context sources available</div>
            <div>Select text or add documents to provide context for AI</div>
          </div>
        ` : html`
          <div class="context-source-list">
            ${repeat(
              this.sources,
              source => source.id,
              source => html`
                <div 
                  class="context-source-item" 
                  data-active=${source.active}
                  @click=${() => this.handleToggleSource(source)}
                >
                  <div class="context-source-icon">
                    ${this.getIconForType(source.type)}
                  </div>
                  <div class="context-source-content">
                    <div class="context-source-title">${source.title}</div>
                    ${source.preview ? html`
                      <div class="context-source-preview">${source.preview}</div>
                    ` : nothing}
                  </div>
                  <div 
                    class="context-source-toggle" 
                    @click=${(e: Event) => this.handleRemoveSource(source, e)}
                  >
                    ${RemoveIcon()}
                  </div>
                </div>
              `
            )}
          </div>
        `}
      </div>
    `;
  }
}

customElements.define('context-panel', ContextPanel);

declare global {
  interface HTMLElementTagNameMap {
    'context-panel': ContextPanel;
  }
}