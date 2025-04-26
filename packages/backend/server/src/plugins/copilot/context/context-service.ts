import { Document, GraphState, SearchOptions, SearchResult } from '../types';

/**
 * Interface for embedding service
 */
export interface EmbeddingService {
  createEmbedding(text: string): Promise<number[]>;
  computeSimilarity(embedding1: number[], embedding2: number[]): number;
}

/**
 * Class for managing context and semantic search
 */
export class ContextService {
  private embeddingService: EmbeddingService;
  private documents: Map<string, Document & { embedding?: number[] }> = new Map();

  constructor(embeddingService: EmbeddingService) {
    this.embeddingService = embeddingService;
  }

  /**
   * Add content to the context
   * @param state Current graph state
   * @param content Content or document to add
   * @returns Updated state with context reference
   */
  async addToContext(
    state: GraphState,
    content: string | Document
  ): Promise<GraphState> {
    // Create document if string was provided
    const document = typeof content === 'string'
      ? { id: `doc_${Date.now()}`, content }
      : content;
    
    // Generate embedding for the document
    const embedding = await this.embeddingService.createEmbedding(document.content);
    
    // Store the document with its embedding
    this.documents.set(document.id, { ...document, embedding });
    
    // Update state with context reference
    return {
      ...state,
      contextReferences: [
        ...(state.contextReferences || []),
        document.id
      ]
    };
  }

  /**
   * Search the context for relevant content
   * @param state Current graph state
   * @param query Search query
   * @param options Search options
   * @returns Array of search results
   */
  async searchContext(
    state: GraphState,
    query: string,
    options: SearchOptions = {}
  ): Promise<SearchResult[]> {
    const {
      limit = 5,
      threshold = 0.7,
      filter
    } = options;
    
    // Get query embedding
    const queryEmbedding = await this.embeddingService.createEmbedding(query);
    
    // Get relevant document IDs from state
    const relevantIds = state.contextReferences || [];
    
    // Get documents to search
    const documentsToSearch = Array.from(this.documents.values())
      .filter(doc => relevantIds.length === 0 || relevantIds.includes(doc.id))
      .filter(doc => !filter || filter(doc));
    
    // Calculate similarity scores
    const results = await Promise.all(
      documentsToSearch.map(async doc => {
        const embedding = doc.embedding || await this.embeddingService.createEmbedding(doc.content);
        const score = this.embeddingService.computeSimilarity(queryEmbedding, embedding);
        
        return {
          content: doc.content,
          score,
          metadata: doc.metadata
        };
      })
    );
    
    // Filter by threshold and sort by score
    return results
      .filter(result => result.score >= threshold)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * Clear the context references in the state
   * @param state Current graph state
   * @returns Updated state with cleared context
   */
  clearContext(state: GraphState): GraphState {
    return {
      ...state,
      contextReferences: []
    };
  }

  /**
   * Delete a document from the context
   * @param documentId ID of the document to delete
   */
  deleteDocument(documentId: string): void {
    this.documents.delete(documentId);
  }

  /**
   * Clear all documents from the context
   */
  clearAllDocuments(): void {
    this.documents.clear();
  }
}