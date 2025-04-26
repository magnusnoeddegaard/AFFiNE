import { WithDisposable } from '@blocksuite/affine/global/lit';
import { ShadowlessElement } from '@blocksuite/affine/std';
import type { EditorHost } from '@blocksuite/affine/std';
import { css, html, nothing } from 'lit';
import { property, state } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';

export interface AIAction {
  id: string;
  icon: string;
  title: string;
  description?: string;
}

/**
 * Selection-based AI action menu that appears when text is selected
 */
export class SelectionActionMenu extends WithDisposable(ShadowlessElement) {
  static override styles = css`
    .selection-action-menu {
      position: absolute;
      background-color: var(--affine-background-primary-color);
      border-radius: 8px;
      box-shadow: var(--affine-shadow-2);
      border: 1px solid var(--affine-border-color);
      padding: 4px;
      min-width: 200px;
      z-index: 1000;
      opacity: 0;
      transform: translateY(10px);
      pointer-events: none;
      transition: opacity 0.2s ease, transform 0.2s ease;
    }

    .selection-action-menu.visible {
      opacity: 1;
      transform: translateY(0);
      pointer-events: auto;
    }

    .selection-action-list {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .selection-action-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      color: var(--affine-text-primary-color);
      white-space: nowrap;
    }

    .selection-action-item:hover {
      background-color: var(--affine-hover-color);
    }

    .selection-action-icon {
      flex-shrink: 0;
      font-size: 16px;
    }

    .selection-action-item-content {
      display: flex;
      flex-direction: column;
      gap: 2px;
      overflow: hidden;
    }

    .selection-action-title {
      font-weight: 500;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .selection-action-description {
      font-size: 12px;
      color: var(--affine-text-secondary-color);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  `;

  @property({ attribute: false })
  accessor host!: EditorHost;

  @property({ attribute: false })
  accessor actions: AIAction[] = [];

  @property({ attribute: false })
  accessor onActionSelect?: (actionId: string, selectedText: string) => void;

  @state()
  accessor isVisible: boolean = false;

  @state()
  accessor position = { x: 0, y: 0 };

  @state()
  accessor selectedText: string = '';

  private selection: Selection | null = null;
  private selectionRange: Range | null = null;

  override connectedCallback() {
    super.connectedCallback();
    
    // Listen for selection changes
    document.addEventListener('selectionchange', this.handleSelectionChange);
    document.addEventListener('mouseup', this.handleMouseUp);
    document.addEventListener('keydown', this.handleKeyDown);
    document.addEventListener('click', this.handleClickOutside);
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    
    // Clean up event listeners
    document.removeEventListener('selectionchange', this.handleSelectionChange);
    document.removeEventListener('mouseup', this.handleMouseUp);
    document.removeEventListener('keydown', this.handleKeyDown);
    document.removeEventListener('click', this.handleClickOutside);
  }

  private handleSelectionChange = () => {
    this.selection = window.getSelection();
    
    // Hide the menu when selection is cleared
    if (!this.selection || this.selection.isCollapsed) {
      this.hide();
    }
  };

  private handleMouseUp = (e: MouseEvent) => {
    if (!this.selection || this.selection.isCollapsed) {
      this.hide();
      return;
    }
    
    // Get the selected text
    const selectedText = this.selection.toString().trim();
    if (!selectedText) {
      this.hide();
      return;
    }
    
    // Only show the menu if there's a reasonably-sized selection
    if (selectedText.length < 10) {
      this.hide();
      return;
    }
    
    // Store the selected text and range
    this.selectedText = selectedText;
    this.selectionRange = this.selection.getRangeAt(0);
    
    // Calculate the position for the menu
    const rect = this.selectionRange.getBoundingClientRect();
    
    // Position the menu above the selection
    this.position = {
      x: rect.left + window.scrollX,
      y: rect.top + window.scrollY - 10 // Position above with a small gap
    };
    
    // Show the menu after a small delay to avoid accidental triggering
    setTimeout(() => {
      this.show();
    }, 300);
  };

  private handleKeyDown = (e: KeyboardEvent) => {
    // Hide the menu on Escape key
    if (e.key === 'Escape') {
      this.hide();
    }
  };

  private handleClickOutside = (e: MouseEvent) => {
    if (this.isVisible && !this.contains(e.target as Node)) {
      this.hide();
    }
  };

  private handleActionSelect = (actionId: string) => {
    if (this.onActionSelect) {
      this.onActionSelect(actionId, this.selectedText);
    }
    this.hide();
  };

  /**
   * Show the selection action menu
   */
  show() {
    this.isVisible = true;
    
    // Position the menu to stay within viewport bounds
    setTimeout(() => {
      const menuEl = this.shadowRoot?.querySelector('.selection-action-menu') as HTMLElement;
      if (!menuEl) return;
      
      const rect = menuEl.getBoundingClientRect();
      
      // Check if the menu goes beyond the right edge of the viewport
      if (rect.right > window.innerWidth) {
        this.position.x = window.innerWidth - rect.width - 10;
      }
      
      // Check if the menu goes beyond the top of the viewport
      if (rect.top < 0) {
        this.position.y = 10; // Position below selection
      }
    }, 0);
  }

  /**
   * Hide the selection action menu
   */
  hide() {
    this.isVisible = false;
  }

  protected override render() {
    return html`
      <div 
        class="selection-action-menu ${this.isVisible ? 'visible' : ''}"
        style="left: ${this.position.x}px; top: ${this.position.y}px;"
      >
        <div class="selection-action-list">
          ${repeat(
            this.actions,
            action => action.id,
            action => html`
              <div 
                class="selection-action-item"
                @click=${() => this.handleActionSelect(action.id)}
              >
                <div class="selection-action-icon">${action.icon}</div>
                <div class="selection-action-item-content">
                  <div class="selection-action-title">${action.title}</div>
                  ${action.description ? html`
                    <div class="selection-action-description">${action.description}</div>
                  ` : nothing}
                </div>
              </div>
            `
          )}
        </div>
      </div>
    `;
  }
}

customElements.define('selection-action-menu', SelectionActionMenu);

declare global {
  interface HTMLElementTagNameMap {
    'selection-action-menu': SelectionActionMenu;
  }
}