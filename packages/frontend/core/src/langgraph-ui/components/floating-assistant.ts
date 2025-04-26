import { WithDisposable } from '@blocksuite/affine/global/lit';
import { ShadowlessElement } from '@blocksuite/affine/std';
import { CloseIcon, MinimizeIcon } from '@blocksuite/icons/lit';
import { css, html, nothing } from 'lit';
import { property, state } from 'lit/decorators.js';

import { LanggraphChatPanel } from '../chat-panel/langgraph-chat-panel';
import { AIWorkspaceMode } from '../ai-workspace';

/**
 * Floating AI assistant that can be moved and resized
 */
export class FloatingAssistant extends WithDisposable(ShadowlessElement) {
  static override styles = css`
    .floating-assistant {
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 400px;
      height: 600px;
      background-color: var(--affine-background-primary-color);
      border-radius: 12px;
      box-shadow: var(--affine-shadow-3);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      z-index: 1000;
      border: 1px solid var(--affine-border-color);
      transition: transform 0.2s ease-in-out, opacity 0.2s ease-in-out;
      transform-origin: bottom right;
    }

    .floating-assistant.minimized {
      transform: scale(0.2);
      opacity: 0.7;
      pointer-events: none;
    }

    .floating-assistant.collapsed {
      height: 58px;
    }

    .floating-assistant-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      border-bottom: 1px solid var(--affine-border-color);
      background-color: var(--affine-background-primary-color);
      cursor: move;
      user-select: none;
      flex-shrink: 0;
    }

    .floating-assistant-title {
      font-size: 16px;
      font-weight: 600;
      color: var(--affine-text-primary-color);
    }

    .floating-assistant-controls {
      display: flex;
      gap: 8px;
    }

    .floating-assistant-button {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      border-radius: 4px;
      cursor: pointer;
      color: var(--affine-icon-secondary);
    }

    .floating-assistant-button:hover {
      background-color: var(--affine-hover-color);
      color: var(--affine-icon-primary);
    }

    .floating-assistant-content {
      flex-grow: 1;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .floating-assistant-resizer {
      position: absolute;
      right: 0;
      bottom: 0;
      width: 20px;
      height: 20px;
      cursor: nwse-resize;
      display: flex;
      align-items: flex-end;
      justify-content: flex-end;
      padding: 4px;
      font-size: 10px;
      color: var(--affine-icon-secondary);
    }

    .floating-assistant-resizer::after {
      content: '';
      display: block;
      width: 8px;
      height: 8px;
      border-right: 2px solid var(--affine-border-color);
      border-bottom: 2px solid var(--affine-border-color);
    }

    .ai-circular-button {
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background-color: var(--affine-primary-color);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 24px;
      box-shadow: var(--affine-shadow-2);
      z-index: 999;
      transition: transform 0.2s ease-in-out, background-color 0.2s ease-in-out;
    }

    .ai-circular-button:hover {
      transform: scale(1.05);
      background-color: var(--affine-primary-hover-color);
    }
  `;

  @property({ attribute: false })
  accessor mode: AIWorkspaceMode = AIWorkspaceMode.Chat;

  @property({ attribute: false })
  accessor title: string = 'AI Assistant';

  @state()
  accessor isVisible: boolean = false;

  @state()
  accessor isCollapsed: boolean = false;

  @state()
  accessor isMinimized: boolean = false;

  @state()
  accessor position = { x: 20, y: 20 };

  @state()
  accessor size = { width: 400, height: 600 };

  private isDragging = false;
  private dragOffset = { x: 0, y: 0 };
  
  private isResizing = false;
  private initialSize = { width: 0, height: 0 };
  private initialPosition = { x: 0, y: 0 };

  override connectedCallback() {
    super.connectedCallback();
    
    // Set up event listeners for drag and resize
    document.addEventListener('mousemove', this.handleMouseMove);
    document.addEventListener('mouseup', this.handleMouseUp);
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    
    // Clean up event listeners
    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('mouseup', this.handleMouseUp);
  }

  private handleMouseMove = (e: MouseEvent) => {
    if (this.isDragging) {
      // Calculate new position based on mouse movement
      const newX = e.clientX - this.dragOffset.x;
      const newY = e.clientY - this.dragOffset.y;
      
      // Apply boundary constraints to keep the assistant in the viewport
      const maxX = window.innerWidth - this.size.width;
      const maxY = window.innerHeight - this.size.height;
      
      this.position = {
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY))
      };
    }
    
    if (this.isResizing) {
      // Calculate new size based on mouse movement
      const deltaX = e.clientX - this.initialPosition.x;
      const deltaY = e.clientY - this.initialPosition.y;
      
      const newWidth = this.initialSize.width + deltaX;
      const newHeight = this.initialSize.height + deltaY;
      
      // Apply minimum size constraints
      this.size = {
        width: Math.max(300, newWidth),
        height: Math.max(200, newHeight)
      };
    }
  };

  private handleMouseUp = () => {
    this.isDragging = false;
    this.isResizing = false;
  };

  private handleHeaderMouseDown = (e: MouseEvent) => {
    // Start dragging
    this.isDragging = true;
    
    // Calculate offset from mouse position to assistant top-left corner
    const rect = this.getBoundingClientRect();
    this.dragOffset = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
    
    // Prevent text selection during drag
    e.preventDefault();
  };

  private handleResizerMouseDown = (e: MouseEvent) => {
    // Start resizing
    this.isResizing = true;
    
    // Store initial size and mouse position
    this.initialSize = { ...this.size };
    this.initialPosition = { x: e.clientX, y: e.clientY };
    
    // Prevent text selection during resize
    e.preventDefault();
  };

  private handleToggleVisibility = () => {
    this.isVisible = !this.isVisible;
    
    // Reset minimized state when showing
    if (this.isVisible) {
      this.isMinimized = false;
    }
  };

  private handleToggleCollapse = () => {
    this.isCollapsed = !this.isCollapsed;
  };

  private handleMinimize = () => {
    this.isMinimized = !this.isMinimized;
  };

  protected override render() {
    return html`
      ${!this.isVisible ? html`
        <div class="ai-circular-button" @click=${this.handleToggleVisibility}>
          🤖
        </div>
      ` : html`
        <div 
          class="floating-assistant ${this.isCollapsed ? 'collapsed' : ''} ${this.isMinimized ? 'minimized' : ''}"
          style="right: ${this.position.x}px; bottom: ${this.position.y}px; width: ${this.size.width}px; height: ${this.size.height}px;"
        >
          <div 
            class="floating-assistant-header"
            @mousedown=${this.handleHeaderMouseDown}
          >
            <div class="floating-assistant-title">${this.title}</div>
            <div class="floating-assistant-controls">
              <div 
                class="floating-assistant-button"
                @click=${this.handleMinimize}
                title="Minimize"
              >
                ${MinimizeIcon()}
              </div>
              <div 
                class="floating-assistant-button"
                @click=${this.handleToggleCollapse}
                title="${this.isCollapsed ? 'Expand' : 'Collapse'}"
              >
                ${this.isCollapsed ? html`▼` : html`▲`}
              </div>
              <div 
                class="floating-assistant-button"
                @click=${this.handleToggleVisibility}
                title="Close"
              >
                ${CloseIcon()}
              </div>
            </div>
          </div>
          
          ${!this.isCollapsed ? html`
            <div class="floating-assistant-content">
              <langgraph-chat-panel
                .sessionTitle=${this.title}
                .mode=${this.mode}
              ></langgraph-chat-panel>
            </div>
            <div 
              class="floating-assistant-resizer"
              @mousedown=${this.handleResizerMouseDown}
            ></div>
          ` : nothing}
        </div>
      `}
    `;
  }
}

customElements.define('floating-assistant', FloatingAssistant);

declare global {
  interface HTMLElementTagNameMap {
    'floating-assistant': FloatingAssistant;
  }
}