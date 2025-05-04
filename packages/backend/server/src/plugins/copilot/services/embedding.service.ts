import { Injectable } from '@nestjs/common';
import { IEmbeddingService } from '../context/embedding-service';

/**
 * Implementation of the EmbeddingService for the Copilot module
 */
@Injectable()
export class EmbeddingService implements IEmbeddingService {
  /**
   * Create an embedding vector from text
   * @param text Text to embed
   * @returns Embedding vector
   */
  async createEmbedding(text: string): Promise<number[]> {
    // This is a placeholder implementation that should be replaced with your actual embedding logic
    // For example, connecting to OpenAI or another embedding provider
    console.log('Creating embedding for text:', text.substring(0, 50) + '...');
    return Array(1536).fill(0).map(() => Math.random() * 2 - 1);
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