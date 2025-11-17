import { ChunkConfig } from "../types/global";

/**
 * 默认配置
 */
export const DEFAULT_CHUNK_CONFIG: ChunkConfig = {
  maxChunkSize: 4096, // 4KB
  minChunkSize: 512, // 512B
  overlapLines: 2, // 2行重叠
};
