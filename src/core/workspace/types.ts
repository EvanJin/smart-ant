export interface FileInfo {
  filePath: string; // 文件的完整路径
  relativePath: string; // 相对于工作区根目录的路径
  isDirectory: boolean; // 是否为目录
}
