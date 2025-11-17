/**
 * 代码分块配置
 */
export interface ChunkConfig {
  maxChunkSize: number; // 最大 chunk 大小（字节）
  minChunkSize: number; // 最小 chunk 大小（字节）
  overlapLines: number; // 重叠行数
}
