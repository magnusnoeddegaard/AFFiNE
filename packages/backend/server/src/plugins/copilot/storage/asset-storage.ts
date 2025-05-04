/**
 * Interface for asset metadata
 */
export interface AssetMetadata {
  id: string;
  name: string;
  type: string;
  size: number;
  createdAt: Date;
  contentType: string;
  tags?: string[];
  [key: string]: any;
}

/**
 * Interface for asset storage service
 */
export interface AssetStorage {
  /**
   * Store an asset
   * @param data Asset data
   * @param metadata Asset metadata
   * @returns Asset ID
   */
  storeAsset(data: Buffer, metadata: Omit<AssetMetadata, 'id' | 'createdAt'>): Promise<string>;
  
  /**
   * Get an asset by ID
   * @param id Asset ID
   * @returns Asset data and metadata
   */
  getAsset(id: string): Promise<{ data: Buffer; metadata: AssetMetadata } | null>;
  
  /**
   * Get asset metadata
   * @param id Asset ID
   * @returns Asset metadata
   */
  getAssetMetadata(id: string): Promise<AssetMetadata | null>;
  
  /**
   * List assets matching criteria
   * @param filter Filter criteria
   * @returns Array of asset metadata
   */
  listAssets(filter?: { 
    type?: string;
    tags?: string[];
    before?: Date;
    after?: Date;
    limit?: number;
  }): Promise<AssetMetadata[]>;
  
  /**
   * Delete an asset
   * @param id Asset ID
   * @returns True if deleted
   */
  deleteAsset(id: string): Promise<boolean>;
}

/**
 * In-memory implementation of asset storage
 */
export class InMemoryAssetStorage implements AssetStorage {
  private assets: Map<string, { data: Buffer; metadata: AssetMetadata }> = new Map();
  
  async storeAsset(
    data: Buffer, 
    metadata: Omit<AssetMetadata, 'id' | 'createdAt'>
  ): Promise<string> {
    const id = `asset_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    
    const { name, type, size, contentType, ...rest } = metadata;
    
    const fullMetadata: AssetMetadata = {
      id,
      name,
      type,
      size,
      contentType,
      createdAt: new Date(),
      ...rest  // Include any additional metadata properties
    };
    
    this.assets.set(id, { data, metadata: fullMetadata });
    
    return id;
  }
  
  async getAsset(id: string): Promise<{ data: Buffer; metadata: AssetMetadata } | null> {
    return this.assets.get(id) || null;
  }
  
  async getAssetMetadata(id: string): Promise<AssetMetadata | null> {
    const asset = this.assets.get(id);
    return asset ? asset.metadata : null;
  }
  
  async listAssets(filter: {
    type?: string;
    tags?: string[];
    before?: Date;
    after?: Date;
    limit?: number;
  } = {}): Promise<AssetMetadata[]> {
    const { type, tags, before, after, limit } = filter;
    
    let result = Array.from(this.assets.values())
      .map(asset => asset.metadata);
    
    // Apply filters
    if (type) {
      result = result.filter(metadata => metadata.type === type);
    }
    
    if (tags && tags.length > 0) {
      result = result.filter(metadata => 
        tags.every(tag => metadata.tags?.includes(tag))
      );
    }
    
    if (before) {
      result = result.filter(metadata => metadata.createdAt < before);
    }
    
    if (after) {
      result = result.filter(metadata => metadata.createdAt > after);
    }
    
    // Sort by creation date (newest first)
    result.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    
    // Apply limit
    if (limit) {
      result = result.slice(0, limit);
    }
    
    return result;
  }
  
  async deleteAsset(id: string): Promise<boolean> {
    return this.assets.delete(id);
  }
}