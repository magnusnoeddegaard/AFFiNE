import { GraphState } from '../types';

/**
 * Interface for session metadata
 */
export interface SessionMetadata {
  id: string;
  userId: string;
  name?: string;
  createdAt: Date;
  updatedAt: Date;
  tags?: string[];
}

/**
 * Interface for session storage service
 */
export interface SessionStorage {
  /**
   * Create a new session
   * @param userId User ID
   * @param initialState Initial state
   * @param metadata Additional metadata
   * @returns Session ID
   */
  createSession(
    userId: string,
    initialState: GraphState,
    metadata?: { name?: string; tags?: string[] }
  ): Promise<string>;
  
  /**
   * Get session state
   * @param sessionId Session ID
   * @returns Session state or null
   */
  getSessionState(sessionId: string): Promise<GraphState | null>;
  
  /**
   * Update session state
   * @param sessionId Session ID
   * @param state New state
   * @returns Success status
   */
  updateSessionState(sessionId: string, state: GraphState): Promise<boolean>;
  
  /**
   * Get session metadata
   * @param sessionId Session ID
   * @returns Session metadata or null
   */
  getSessionMetadata(sessionId: string): Promise<SessionMetadata | null>;
  
  /**
   * List sessions for a user
   * @param userId User ID
   * @param filter Filter criteria
   * @returns Array of session metadata
   */
  listSessions(userId: string, filter?: {
    tags?: string[];
    before?: Date;
    after?: Date;
    limit?: number;
  }): Promise<SessionMetadata[]>;
  
  /**
   * Delete a session
   * @param sessionId Session ID
   * @returns Success status
   */
  deleteSession(sessionId: string): Promise<boolean>;
}

/**
 * In-memory implementation of session storage
 */
export class InMemorySessionStorage implements SessionStorage {
  private sessions: Map<string, { 
    state: GraphState; 
    metadata: SessionMetadata 
  }> = new Map();
  
  async createSession(
    userId: string,
    initialState: GraphState,
    metadata: { name?: string; tags?: string[] } = {}
  ): Promise<string> {
    const id = `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    const now = new Date();
    
    const sessionMetadata: SessionMetadata = {
      id,
      userId,
      name: metadata.name,
      tags: metadata.tags,
      createdAt: now,
      updatedAt: now
    };
    
    this.sessions.set(id, { 
      state: initialState,
      metadata: sessionMetadata
    });
    
    return id;
  }
  
  async getSessionState(sessionId: string): Promise<GraphState | null> {
    const session = this.sessions.get(sessionId);
    return session ? session.state : null;
  }
  
  async updateSessionState(sessionId: string, state: GraphState): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      return false;
    }
    
    this.sessions.set(sessionId, {
      state,
      metadata: {
        ...session.metadata,
        updatedAt: new Date()
      }
    });
    
    return true;
  }
  
  async getSessionMetadata(sessionId: string): Promise<SessionMetadata | null> {
    const session = this.sessions.get(sessionId);
    return session ? session.metadata : null;
  }
  
  async listSessions(userId: string, filter: {
    tags?: string[];
    before?: Date;
    after?: Date;
    limit?: number;
  } = {}): Promise<SessionMetadata[]> {
    const { tags, before, after, limit } = filter;
    
    let result = Array.from(this.sessions.values())
      .filter(session => session.metadata.userId === userId)
      .map(session => session.metadata);
    
    // Apply filters
    if (tags && tags.length > 0) {
      result = result.filter(metadata => 
        tags.every(tag => metadata.tags?.includes(tag))
      );
    }
    
    if (before) {
      result = result.filter(metadata => metadata.updatedAt < before);
    }
    
    if (after) {
      result = result.filter(metadata => metadata.updatedAt > after);
    }
    
    // Sort by update date (newest first)
    result.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    
    // Apply limit
    if (limit) {
      result = result.slice(0, limit);
    }
    
    return result;
  }
  
  async deleteSession(sessionId: string): Promise<boolean> {
    return this.sessions.delete(sessionId);
  }
}