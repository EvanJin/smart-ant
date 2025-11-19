/**
 * 代码块接口
 *
 * 表示代码文件中的一个分块单元，包含内容、位置、哈希和嵌入向量等信息
 */
export interface CodeChunk {
  /** chunk 的唯一标识符 */
  id: string;
  /** 文件的绝对路径 */
  filePath: string;
  /** 文件的相对路径 */
  relativePath: string;
  /** chunk 的文本内容 */
  content: string;
  /** chunk 在文件中的起始行号 */
  startLine: number;
  /** chunk 在文件中的结束行号 */
  endLine: number;
  /** chunk 内容的 SHA256 哈希值 */
  hash: string;
  /** chunk 的大小（以字节为单位） */
  size: number;
  /** chunk 的文本嵌入向量，用于语义搜索 */
  embedding: number[];
}

/**
 * Merkle 节点数据接口
 *
 * 表示 Merkle 树中的一个节点，可以是根节点、文件节点或代码块节点
 */
export interface MerkleNodeData {
  /** 节点的 SHA256 哈希值 */
  hash: string;
  /** 节点类型：root（根节点）、file（文件节点）或 chunk（代码块节点） */
  type: "file" | "chunk" | "root";
  /** 文件路径（仅文件节点有效） */
  path?: string;
  /** 代码块数据（仅 chunk 节点有效） */
  chunk?: CodeChunk;
  /** 子节点列表 */
  children?: MerkleNodeData[];
}

/**
 * Merkle 树统计信息接口
 *
 * 包含 Merkle 树构建过程中的统计数据
 */
export interface MerkleTreeStats {
  /** 索引的总文件数 */
  totalFiles: number;
  /** 生成的总代码块数 */
  totalChunks: number;
  /** 所有代码块的总大小（以字节为单位） */
  totalSize: number;
  /** Merkle 树的根哈希值 */
  rootHash: string;
  /** 构建 Merkle 树所花费的时间（以毫秒为单位） */
  buildTime: number;
}

/**
 * Merkle 节点类型
 *
 * - root: 根节点，代表整个代码库
 * - file: 文件节点，代表一个代码文件
 * - chunk: 代码块节点，代表文件中的一个代码片段
 */
export type MerkleNodeType = "file" | "chunk" | "root";

/**
 * 搜索结果接口
 *
 * 表示代码搜索的结果，包含匹配的代码块和相关性评分
 */
export interface SearchResult {
  /** 匹配的代码块列表 */
  chunks: CodeChunk[];
  /** 搜索结果的相关性评分 */
  score: number;
}
