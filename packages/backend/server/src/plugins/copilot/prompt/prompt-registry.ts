import { PromptTemplate } from './prompt-template';

/**
 * Registry for managing and retrieving prompt templates
 */
export class PromptRegistry {
  private templates: Map<string, PromptTemplate> = new Map();
  
  /**
   * Register a prompt template
   * @param key Unique key for the template
   * @param template The prompt template
   */
  register(key: string, template: PromptTemplate): void {
    this.templates.set(key, template);
  }
  
  /**
   * Get a prompt template by key
   * @param key Template key
   * @returns The template or undefined if not found
   */
  get(key: string): PromptTemplate | undefined {
    return this.templates.get(key);
  }
  
  /**
   * Generate a prompt from a template
   * @param key Template key
   * @param variables Variables to insert into the template
   * @returns Generated prompt string
   * @throws Error if template not found
   */
  generate(key: string, variables?: Record<string, any>): string {
    const template = this.templates.get(key);
    
    if (!template) {
      throw new Error(`Prompt template not found: ${key}`);
    }
    
    return template.generate(variables);
  }
  
  /**
   * Remove a template from the registry
   * @param key Template key
   * @returns Whether the template was removed
   */
  unregister(key: string): boolean {
    return this.templates.delete(key);
  }
  
  /**
   * Check if a template exists
   * @param key Template key
   * @returns Whether the template exists
   */
  has(key: string): boolean {
    return this.templates.has(key);
  }
  
  /**
   * Get all template keys
   * @returns Array of template keys
   */
  getKeys(): string[] {
    return Array.from(this.templates.keys());
  }
}