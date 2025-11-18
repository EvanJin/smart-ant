export interface CodeChunk {
  id: string; // chunk 的唯一标识
  filePath: string; // 文件路径
  relativePath: string; // 相对路径
  content: string; // chunk 的内容
  startLine: number; // 起始行号
  endLine: number; // 结束行号
  hash: string; // chunk 的哈希值
  size: number; // chunk 的大小（字节）
  embedding: number[]; // chunk 的文本嵌入向量
}

export interface MerkleNodeData {
  hash: string; // 节点哈希值
  type: "file" | "chunk" | "root"; // 节点类型
  path?: string; // 文件路径（文件节点）
  chunk?: CodeChunk; // chunk 数据（chunk 节点）
  children?: MerkleNodeData[]; // 子节点
}

export interface MerkleTreeStats {
  totalFiles: number; // 总文件数
  totalChunks: number; // 总 chunk 数
  totalSize: number; // 总大小（字节）
  rootHash: string; // 根哈希
  buildTime: number; // 构建时间（毫秒）
}

export interface SearchResult {
  chunks: CodeChunk[];
  score: number;
}
