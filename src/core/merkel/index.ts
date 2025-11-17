/**
 * Merkle 树模块导出
 * 提供代码分块和 Merkle 树功能
 */

export { default as Merkle } from "@/core/merkel/core";
export { CodeChunker } from "@/core/merkel/chunk";
export type { ChunkConfig } from "@/types/global";
export { MerkleNode } from "@/core/merkel/node";
export type {
  CodeChunk,
  MerkleNodeData,
  MerkleTreeStats,
} from "@/core/merkel/types";
