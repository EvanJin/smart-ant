import { ChunkConfig } from "../types/global";

/**
 * 默认配置
 */
export const DEFAULT_CHUNK_CONFIG: ChunkConfig = {
  maxChunkSize: 4096, // 4KB
  minChunkSize: 512, // 512B
  overlapLines: 2, // 2行重叠
};

/**
 * 最大变更文件比例
 */
export const MAX_CHANGED_FILES = 0.8;
