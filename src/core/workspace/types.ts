export interface FileInfo {
  filePath: string; // 文件的完整路径
  relativePath: string; // 相对于工作区根目录的路径
  isDirectory: boolean; // 是否为目录
}

/**
 * 文件变更类型
 */
export enum FileChangeType {
  ADDED = "added", // 新增文件
  MODIFIED = "modified", // 修改文件
  DELETED = "deleted", // 删除文件
}

/**
 * 文件变更信息
 */
export interface FileChange {
  /** 文件路径 */
  filePath: string;
  /** 相对路径 */
  relativePath: string;
  /** 变更类型 */
  changeType: FileChangeType;
  /** 文件的新哈希（如果适用） */
  newHash?: string;
  /** 文件的旧哈希（如果适用） */
  oldHash?: string;
}

/**
 * 索引状态（用于持久化）
 */
export interface IndexState {
  /** 根哈希 */
  rootHash: string;
  /** 文件哈希映射表 */
  fileHashes: Record<string, string>;
  /** 最后更新时间 */
  lastUpdated: number;
  /** 总文件数 */
  totalFiles: number;
  /** 总代码块数 */
  totalChunks: number;
}
