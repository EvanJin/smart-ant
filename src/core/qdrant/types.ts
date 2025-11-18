/**
 * Qdrant 配置接口
 */
export interface QdrantConfig {
  repo?: string;
  url?: string;
  apiKey?: string;
  vectorSize?: number;
  batchSize?: number;
}

/**
 * 批量插入结果
 */
export interface BatchInsertResult {
  success: number;
  failed: number;
  errors: Array<{ chunkId: string; error: string }>;
}
