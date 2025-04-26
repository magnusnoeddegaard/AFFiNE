import { EmbeddingService } from './context-service';

/**
 * Interface for embedding provider
 */
export interface EmbeddingProvider {
  embedText(text: string): Promise<number[]>;
  name: string;
}

/**
 * Base implementation of embedding service that works with providers
 */
export class DefaultEmbeddingService implements EmbeddingService {
  private provider: EmbeddingProvider;
  private cache: Map<string, number[]> = new Map();
  private cacheEnabled: boolean;

  constructor(provider: EmbeddingProvider, options: { cacheEnabled?: boolean } = {}) {
    this.provider = provider;
    this.cacheEnabled = options.cacheEnabled ?? true;
  }

  /**
   * Generate embedding for text
   * @param text Text to embed
   * @returns Embedding vector
   */
  async createEmbedding(text: string): Promise<number[]> {
    // Use cache if enabled and present
    if (this.cacheEnabled) {
      const cachedEmbedding = this.cache.get(text);
      if (cachedEmbedding) {
        return cachedEmbedding;
      }
    }
    
    // Get embedding from provider
    const embedding = await this.provider.embedText(text);
    
    // Store in cache if enabled
    if (this.cacheEnabled) {
      this.cache.set(text, embedding);
    }
    
    return embedding;
  }

  /**
   * Compute cosine similarity between two embeddings
   * @param embedding1 First embedding
   * @param embedding2 Second embedding
   * @returns Similarity score (0-1)
   */
  computeSimilarity(embedding1: number[], embedding2: number[]): number {
    if (embedding1.length !== embedding2.length) {
      throw new Error('Embeddings must have the same length');
    }
    
    // Compute dot product
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;
    
    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i];
      norm1 += embedding1[i] * embedding1[i];
      norm2 += embedding2[i] * embedding2[i];
    }
    
    // Calculate cosine similarity
    norm1 = Math.sqrt(norm1);
    norm2 = Math.sqrt(norm2);
    
    if (norm1 === 0 || norm2 === 0) {
      return 0;
    }
    
    return dotProduct / (norm1 * norm2);
  }

  /**
   * Clear the embedding cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Set whether caching is enabled
   * @param enabled Whether caching is enabled
   */
  setCacheEnabled(enabled: boolean): void {
    this.cacheEnabled = enabled;
  }

  /**
   * Get the current embedding provider
   */
  getProvider(): EmbeddingProvider {
    return this.provider;
  }

  /**
   * Change the embedding provider
   * @param provider New embedding provider
   */
  setProvider(provider: EmbeddingProvider): void {
    this.provider = provider;
    this.clearCache();
  }
}