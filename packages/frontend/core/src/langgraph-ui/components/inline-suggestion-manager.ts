import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { AIService } from '../services/ai-service';
import { debounce } from '../utils/debounce';

/**
 * Manager component that handles inline AI suggestions in the editor
 * This component integrates with the editor to provide real-time AI suggestions
 * as the user types.
 */
@customElement('affine-inline-suggestion-manager')
export class InlineSuggestionManager extends LitElement {
  // Reference to the AI service
  private aiService: AIService = new AIService();
  
  // Suggestion generation debounce time in milliseconds
  private readonly debounceTime = 500;
  
  // Track if suggestions are enabled by user preference
  @property({ type: Boolean }) 
  enabled = true;
  
  // Editor element to monitor and inject suggestions into
  @property({ type: Object })
  editorElement: HTMLElement | null = null;
  
  // Current user ID for personalization
  @property({ type: String })
  userId: string = '';
  
  // Document ID for context-aware suggestions
  @property({ type: String })
  documentId: string = '';
  
  // Internal state
  @state() private currentSessionId: string | null = null;
  @state() private isGenerating = false;
  @state() private lastCursorPosition: number = 0;
  @state() private lastContent: string = '';
  
  // Debounced handler for content changes
  private handleContentChangeDebounced = debounce(
    this.generateSuggestion.bind(this),
    this.debounceTime
  );
  
  // Observer for editor changes
  private mutationObserver: MutationObserver | null = null;
  
  connectedCallback() {
    super.connectedCallback();
    this.setupEditorMonitoring();
  }
  
  disconnectedCallback() {
    this.cleanup();
    super.disconnectedCallback();
  }
  
  updated(changedProperties: Map<string, any>) {
    if (changedProperties.has('editorElement') && this.editorElement) {
      this.setupEditorMonitoring();
    }
    
    if (changedProperties.has('enabled')) {
      if (!this.enabled) {
        this.removeAllSuggestions();
      }
    }
  }
  
  /**
   * Set up monitoring of the editor for content changes
   */
  private setupEditorMonitoring() {
    // Clean up any existing observers
    this.cleanup();
    
    if (!this.editorElement || !this.enabled) return;
    
    // Create mutation observer to watch for content changes
    this.mutationObserver = new MutationObserver(this.handleEditorMutation.bind(this));
    this.mutationObserver.observe(this.editorElement, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    
    // Add event listeners for cursor movement
    this.editorElement.addEventListener('click', this.handleCursorMovement.bind(this));
    this.editorElement.addEventListener('keydown', this.handleKeyDown.bind(this));
    
    // Initial content analysis
    this.updateContentSnapshot();
  }
  
  /**
   * Clean up all observers and listeners
   */
  private cleanup() {
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
      this.mutationObserver = null;
    }
    
    if (this.editorElement) {
      this.editorElement.removeEventListener('click', this.handleCursorMovement);
      this.editorElement.removeEventListener('keydown', this.handleKeyDown);
    }
    
    // Cancel any active suggestion generation
    if (this.currentSessionId) {
      this.aiService.cancelSession(this.currentSessionId);
      this.currentSessionId = null;
    }
  }
  
  /**
   * Handle mutations in the editor content
   */
  private handleEditorMutation(mutations: MutationRecord[]) {
    if (!this.enabled || this.isGenerating) return;
    
    // Check if this is a relevant text change
    const isRelevantChange = mutations.some(mutation => 
      mutation.type === 'characterData' || 
      (mutation.type === 'childList' && 
        (mutation.addedNodes.length > 0 || mutation.removedNodes.length > 0))
    );
    
    if (isRelevantChange) {
      this.updateContentSnapshot();
      this.handleContentChangeDebounced();
    }
  }
  
  /**
   * Handle cursor movement in the editor
   */
  private handleCursorMovement() {
    // Get current cursor position
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      this.lastCursorPosition = this.getCursorPosition(selection);
    }
  }
  
  /**
   * Handle special key presses
   */
  private handleKeyDown(event: KeyboardEvent) {
    // Handle suggestion acceptance with Tab
    if (event.key === 'Tab' && this.hasSuggestionElement()) {
      const suggestionElement = this.getSuggestionElement();
      if (suggestionElement) {
        event.preventDefault();
        this.acceptSuggestion(suggestionElement);
      }
    }
    
    // Handle suggestion rejection with Escape
    if (event.key === 'Escape' && this.hasSuggestionElement()) {
      event.preventDefault();
      this.removeAllSuggestions();
    }
    
    // Update cursor position
    this.handleCursorMovement();
  }
  
  /**
   * Update the snapshot of the current content
   */
  private updateContentSnapshot() {
    if (!this.editorElement) return;
    
    this.lastContent = this.editorElement.textContent || '';
    
    // Update cursor position
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      this.lastCursorPosition = this.getCursorPosition(selection);
    }
  }
  
  /**
   * Get cursor position in the editor
   */
  private getCursorPosition(selection: Selection): number {
    if (!this.editorElement) return 0;
    
    // Get the range at current cursor position
    const range = selection.getRangeAt(0);
    
    // Create a range from the start of editor to cursor position
    const cursorPositionRange = document.createRange();
    cursorPositionRange.setStart(this.editorElement, 0);
    cursorPositionRange.setEnd(range.startContainer, range.startOffset);
    
    // Return the length of this range
    return cursorPositionRange.toString().length;
  }
  
  /**
   * Generate an inline suggestion based on current content
   */
  private async generateSuggestion() {
    if (!this.enabled || !this.editorElement || !this.lastContent || this.isGenerating) {
      return;
    }
    
    // Check if we're in a suitable context for suggestions
    if (!this.shouldGenerateSuggestion()) {
      return;
    }
    
    try {
      this.isGenerating = true;
      
      // Generate a session ID if we don't have one
      if (!this.currentSessionId) {
        this.currentSessionId = await this.aiService.createSession({
          userId: this.userId,
          type: 'inline-suggestion',
        });
      }
      
      // Get the context to send
      const contextBeforeCursor = this.lastContent.substring(0, this.lastCursorPosition);
      const contextAfterCursor = this.lastContent.substring(this.lastCursorPosition);
      
      // Prepare document context if available
      const contextParams = this.documentId ? { docId: this.documentId } : {};
      
      // Call the AI service to generate a suggestion
      const result = await this.aiService.generateInlineSuggestion(
        this.currentSessionId,
        {
          textBeforeCursor: contextBeforeCursor,
          textAfterCursor: contextAfterCursor,
          ...contextParams
        }
      );
      
      // If we have a suggestion, show it
      if (result && result.suggestion && result.suggestion.trim()) {
        this.showSuggestion(result.suggestion);
      }
    } catch (error) {
      console.error('Error generating suggestion:', error);
    } finally {
      this.isGenerating = false;
    }
  }
  
  /**
   * Determine if we should generate a suggestion
   */
  private shouldGenerateSuggestion(): boolean {
    // Don't suggest for very short content
    if (this.lastContent.length < 30) {
      return false;
    }
    
    // Don't suggest if the user is in the middle of a word
    const textAtCursor = this.lastContent.substring(
      Math.max(0, this.lastCursorPosition - 1), 
      this.lastCursorPosition + 1
    );
    
    const isTypingWord = /\w\w/.test(textAtCursor);
    if (isTypingWord) {
      return false;
    }
    
    // Don't suggest if there's already a suggestion
    if (this.hasSuggestionElement()) {
      return false;
    }
    
    return true;
  }
  
  /**
   * Show a suggestion at the current cursor position
   */
  private showSuggestion(suggestion: string) {
    if (!this.editorElement) return;
    
    // Remove any existing suggestions
    this.removeAllSuggestions();
    
    // Create the suggestion element
    const suggestionElement = document.createElement('affine-inline-suggestion');
    suggestionElement.setAttribute('text', suggestion);
    
    // Add click handlers for the suggestion element
    suggestionElement.addEventListener('accept', () => {
      this.acceptSuggestion(suggestionElement);
    });
    
    suggestionElement.addEventListener('reject', () => {
      suggestionElement.remove();
    });
    
    // Insert at the current cursor position
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.insertNode(suggestionElement);
    }
  }
  
  /**
   * Accept the current suggestion
   */
  private acceptSuggestion(suggestionElement: Element) {
    const suggestion = suggestionElement.getAttribute('text') || '';
    
    // Create a text node with the suggestion text
    const textNode = document.createTextNode(suggestion);
    
    // Replace the suggestion element with the text
    suggestionElement.parentNode?.replaceChild(textNode, suggestionElement);
    
    // Set cursor position after the inserted text
    const selection = window.getSelection();
    if (selection) {
      const range = document.createRange();
      range.setStartAfter(textNode);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    }
  }
  
  /**
   * Check if there is a suggestion element in the editor
   */
  private hasSuggestionElement(): boolean {
    if (!this.editorElement) return false;
    return !!this.getSuggestionElement();
  }
  
  /**
   * Get the current suggestion element if it exists
   */
  private getSuggestionElement(): Element | null {
    if (!this.editorElement) return null;
    return this.editorElement.querySelector('affine-inline-suggestion');
  }
  
  /**
   * Remove all suggestion elements from the editor
   */
  private removeAllSuggestions() {
    if (!this.editorElement) return;
    
    const suggestionElements = this.editorElement.querySelectorAll('affine-inline-suggestion');
    suggestionElements.forEach(element => element.remove());
  }
  
  render() {
    // This component doesn't render visible UI
    return html``;
  }
  
  static styles = css`
    :host {
      display: none;
    }
  `;
}