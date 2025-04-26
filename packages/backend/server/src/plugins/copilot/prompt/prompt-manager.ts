import { PromptRegistry } from './prompt-registry';
import { PromptTemplate, StringPromptTemplate } from './prompt-template';

/**
 * Interface for saved prompt
 */
export interface SavedPrompt {
  id: string;
  name: string;
  description?: string;
  content: string;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Interface for prompt storage
 */
export interface PromptStorage {
  savePrompt(prompt: Omit<SavedPrompt, 'id' | 'createdAt' | 'updatedAt'>): Promise<SavedPrompt>;
  getPrompt(id: string): Promise<SavedPrompt | null>;
  listPrompts(filter?: { tags?: string[] }): Promise<SavedPrompt[]>;
  updatePrompt(id: string, updates: Partial<SavedPrompt>): Promise<SavedPrompt | null>;
  deletePrompt(id: string): Promise<boolean>;
}

/**
 * Manager for prompt templates and saved prompts
 */
export class PromptManager {
  private registry: PromptRegistry;
  private storage: PromptStorage | null;
  
  constructor(storage: PromptStorage | null = null) {
    this.registry = new PromptRegistry();
    this.storage = storage;
  }
  
  /**
   * Register a prompt template
   * @param key Template key
   * @param template Prompt template
   */
  registerTemplate(key: string, template: PromptTemplate): void {
    this.registry.register(key, template);
  }
  
  /**
   * Get a prompt template
   * @param key Template key
   * @returns The template or undefined
   */
  getTemplate(key: string): PromptTemplate | undefined {
    return this.registry.get(key);
  }
  
  /**
   * Generate a prompt from a template
   * @param key Template key
   * @param variables Variables to insert
   * @returns Generated prompt
   */
  generateFromTemplate(key: string, variables?: Record<string, any>): string {
    return this.registry.generate(key, variables);
  }
  
  /**
   * Save a user prompt
   * @param name Prompt name
   * @param content Prompt content
   * @param description Optional description
   * @param tags Optional tags
   * @returns The saved prompt
   */
  async savePrompt(
    name: string,
    content: string,
    description?: string,
    tags?: string[]
  ): Promise<SavedPrompt> {
    if (!this.storage) {
      throw new Error('No prompt storage configured');
    }
    
    return this.storage.savePrompt({
      name,
      content,
      description,
      tags
    });
  }
  
  /**
   * Get a saved prompt
   * @param id Prompt ID
   * @returns The prompt or null
   */
  async getSavedPrompt(id: string): Promise<SavedPrompt | null> {
    if (!this.storage) {
      throw new Error('No prompt storage configured');
    }
    
    return this.storage.getPrompt(id);
  }
  
  /**
   * List saved prompts
   * @param tags Optional tags to filter by
   * @returns Array of saved prompts
   */
  async listSavedPrompts(tags?: string[]): Promise<SavedPrompt[]> {
    if (!this.storage) {
      throw new Error('No prompt storage configured');
    }
    
    return this.storage.listPrompts({ tags });
  }
  
  /**
   * Get a prompt template from a saved prompt
   * @param id Saved prompt ID
   * @returns Prompt template
   */
  async getTemplateFromSavedPrompt(id: string): Promise<PromptTemplate> {
    const savedPrompt = await this.getSavedPrompt(id);
    
    if (!savedPrompt) {
      throw new Error(`Saved prompt not found: ${id}`);
    }
    
    return new StringPromptTemplate(savedPrompt.content);
  }
  
  /**
   * Generate a prompt from a saved prompt
   * @param id Saved prompt ID
   * @param variables Variables to insert
   * @returns Generated prompt
   */
  async generateFromSavedPrompt(id: string, variables?: Record<string, any>): Promise<string> {
    const template = await this.getTemplateFromSavedPrompt(id);
    return template.generate(variables);
  }
}