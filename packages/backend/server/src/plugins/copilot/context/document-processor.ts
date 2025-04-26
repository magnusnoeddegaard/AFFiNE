import { Document } from '../types';

/**
 * Interface for document processors
 */
export interface DocumentProcessor {
  /**
   * Process content into a document
   * @param content Raw content
   * @param metadata Optional metadata
   * @returns Processed document
   */
  process(content: string | Buffer, metadata?: Record<string, any>): Promise<Document>;
  
  /**
   * Check if this processor can handle the content
   * @param content Raw content
   * @param metadata Optional metadata
   * @returns True if this processor can handle the content
   */
  canProcess(content: string | Buffer, metadata?: Record<string, any>): boolean;
}

/**
 * Processor for plain text documents
 */
export class TextDocumentProcessor implements DocumentProcessor {
  canProcess(content: string | Buffer): boolean {
    // Can process any string or Buffer that can be converted to string
    return typeof content === 'string' || Buffer.isBuffer(content);
  }
  
  async process(content: string | Buffer, metadata?: Record<string, any>): Promise<Document> {
    const textContent = Buffer.isBuffer(content) ? content.toString('utf-8') : content;
    
    return {
      id: `text_${Date.now()}`,
      content: textContent,
      metadata: {
        type: 'text',
        size: textContent.length,
        ...metadata
      }
    };
  }
}

/**
 * Processor for structured data like JSON
 */
export class JsonDocumentProcessor implements DocumentProcessor {
  canProcess(content: string | Buffer, metadata?: Record<string, any>): boolean {
    if (metadata?.type === 'json') {
      return true;
    }
    
    try {
      const textContent = Buffer.isBuffer(content) ? content.toString('utf-8') : content;
      const trimmed = textContent.trim();
      
      return (
        (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
        (trimmed.startsWith('[') && trimmed.endsWith(']'))
      );
    } catch {
      return false;
    }
  }
  
  async process(content: string | Buffer, metadata?: Record<string, any>): Promise<Document> {
    const textContent = Buffer.isBuffer(content) ? content.toString('utf-8') : content;
    
    try {
      // Parse JSON to get its structure
      const parsed = JSON.parse(textContent);
      
      // Create a normalized text representation of the JSON
      const normalizedContent = this.normalizeJson(parsed);
      
      return {
        id: `json_${Date.now()}`,
        content: normalizedContent,
        metadata: {
          type: 'json',
          rawContent: textContent,
          size: textContent.length,
          ...metadata
        }
      };
    } catch (error) {
      throw new Error(`Failed to process JSON: ${error.message}`);
    }
  }
  
  /**
   * Convert JSON to a standardized text format
   * @param data Parsed JSON data
   * @param prefix Current prefix for nested objects
   * @returns Text representation
   */
  private normalizeJson(data: any, prefix = ''): string {
    if (typeof data !== 'object' || data === null) {
      return `${prefix}: ${data}`;
    }
    
    if (Array.isArray(data)) {
      if (data.length === 0) {
        return `${prefix}: []`;
      }
      
      return data.map((item, index) => 
        this.normalizeJson(item, `${prefix}[${index}]`)
      ).join('\n');
    }
    
    const keys = Object.keys(data);
    
    if (keys.length === 0) {
      return `${prefix}: {}`;
    }
    
    return keys.map(key => {
      const newPrefix = prefix ? `${prefix}.${key}` : key;
      return this.normalizeJson(data[key], newPrefix);
    }).join('\n');
  }
}

/**
 * Registry that manages document processors
 */
export class DocumentProcessorRegistry {
  private processors: DocumentProcessor[] = [];
  
  /**
   * Register a document processor
   * @param processor Processor to register
   */
  register(processor: DocumentProcessor): void {
    this.processors.push(processor);
  }
  
  /**
   * Process content into a document
   * @param content Raw content
   * @param metadata Optional metadata
   * @returns Processed document
   * @throws Error if no processor can handle the content
   */
  async process(content: string | Buffer, metadata?: Record<string, any>): Promise<Document> {
    for (const processor of this.processors) {
      if (processor.canProcess(content, metadata)) {
        return processor.process(content, metadata);
      }
    }
    
    throw new Error('No document processor available for this content type');
  }
  
  /**
   * Initialize the registry with default processors
   */
  static createDefault(): DocumentProcessorRegistry {
    const registry = new DocumentProcessorRegistry();
    
    // Register default processors
    registry.register(new JsonDocumentProcessor());
    registry.register(new TextDocumentProcessor());
    
    return registry;
  }
}