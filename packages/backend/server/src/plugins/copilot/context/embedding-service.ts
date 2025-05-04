import { Injectable, Optional } from '@nestjs/common';

/**
 * Injection token for the embedding service
 */
export const EMBEDDING_SERVICE = 'EMBEDDING_SERVICE';

/**
 * Configuration for embedding service
 */
export interface EmbeddingServiceConfig {
  name: string;
  embedText: (text: string) => Promise<number[]>;
}

/**
 * Interface for embedding service functionality
 */
export interface IEmbeddingService {
  createEmbedding(text: string): Promise<number[]>;
  computeSimilarity(embedding1: number[], embedding2: number[]): number;
}

/**
 * Default implementation of the embedding service
 */
@Injectable()
export class DefaultEmbeddingService implements IEmbeddingService {
  private name: string = 'default';
  private embedTextFn: (text: string) => Promise<number[]>;

  constructor(@Optional() config?: EmbeddingServiceConfig) {
    if (config) {
      this.name = config.name;
      this.embedTextFn = config.embedText;
    } else {
      // Default implementation if no config provided
      this.embedTextFn = async (text: string) => {
        console.warn('[DefaultEmbeddingService] Using fallback random embeddings');
        return Array(1536).fill(0).map(() => Math.random() * 2 - 1);
      };
    }
  }

  /**
   * Create an embedding vector from text
   * @param text Text to embed
   * @returns Embedding vector
   */
  async createEmbedding(text: string): Promise<number[]> {
    return this.embedTextFn(text);
  }

  /**
   * Compute similarity between two embedding vectors using cosine similarity
   * @param embedding1 First embedding vector
   * @param embedding2 Second embedding vector
   * @returns Similarity score (0-1)
   */
  computeSimilarity(embedding1: number[], embedding2: number[]): number {
    // Cosine similarity implementation
    if (embedding1.length !== embedding2.length) {
      throw new Error('Embeddings must have the same dimensions');
    }

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i];
      norm1 += embedding1[i] * embedding1[i];
      norm2 += embedding2[i] * embedding2[i];
    }

    // Avoid division by zero
    if (norm1 === 0 || norm2 === 0) return 0;

    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }
}