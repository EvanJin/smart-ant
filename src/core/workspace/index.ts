import fs from "fs";
import path from "path";
import ignore from "ignore";
import { CODE_EXTENSIONS } from "@/config/code";
import { FileInfo } from "@/core/workspace/types";
import Merkle from "@/core/merkel/core";
import { ChunkConfig } from "@/types/global";
import { CodeChunk, MerkleTreeStats } from "@/core/merkel/types";

class Workspace {
  private path: string;
  private ig: ReturnType<typeof ignore> | null = null;
  private codeOnly: boolean = false;
  private merkle: Merkle | null = null;

  constructor(path: string, codeOnly: boolean = false) {
    this.path = path;
    this.codeOnly = codeOnly;
    this.loadGitignore();
  }

  getWorkspaceName() {
    return this.path.split("/").pop();
  }

  /**
   * 加载 .gitignore 文件
   */
  private loadGitignore(): void {
    const gitignorePath = path.join(this.path, ".gitignore");
    this.ig = ignore();

    // 默认忽略 .git 目录
    this.ig.add(".git");

    try {
      if (fs.existsSync(gitignorePath)) {
        const gitignoreContent = fs.readFileSync(gitignorePath, "utf-8");
        this.ig.add(gitignoreContent);
        console.log(`已加载 .gitignore 文件: ${gitignorePath}`);
      } else {
        console.log("未找到 .gitignore 文件，将使用默认规则");
      }
    } catch (error) {
      console.error("读取 .gitignore 文件失败:", error);
    }
  }

  /**
   * 检查路径是否应该被忽略
   */
  private shouldIgnore(relativePath: string): boolean {
    if (!this.ig) {
      return false;
    }
    return this.ig.ignores(relativePath);
  }

  /**
   * 检查文件是否为代码文件
   */
  private isCodeFile(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return CODE_EXTENSIONS.has(ext);
  }

  /**
   * 递归遍历目录，获取所有文件
   * @param dirPath 要遍历的目录路径（默认为工作区根目录）
   * @returns 文件信息数组
   */
  public getAllFiles(dirPath?: string): FileInfo[] {
    const targetPath = dirPath || this.path;
    const files: FileInfo[] = [];

    const traverse = (currentPath: string) => {
      try {
        const entries = fs.readdirSync(currentPath, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(currentPath, entry.name);
          const relativePath = path.relative(this.path, fullPath);

          // 检查是否应该忽略
          if (this.shouldIgnore(relativePath)) {
            continue;
          }

          const fileInfo: FileInfo = {
            filePath: fullPath,
            relativePath: relativePath,
            isDirectory: entry.isDirectory(),
          };

          // 如果设置了只遍历代码文件，且当前是文件（非目录），则检查是否为代码文件
          if (
            this.codeOnly &&
            !entry.isDirectory() &&
            !this.isCodeFile(fullPath)
          ) {
            continue;
          }

          files.push(fileInfo);

          // 如果是目录，递归遍历
          if (entry.isDirectory()) {
            traverse(fullPath);
          }
        }
      } catch (error) {
        console.error(`读取目录失败 ${currentPath}:`, error);
      }
    };

    traverse(targetPath);
    return files;
  }

  /**
   * 获取所有文件（不包括目录）
   */
  public getFilesOnly(): FileInfo[] {
    return this.getAllFiles().filter((file) => !file.isDirectory);
  }

  /**
   * 获取所有目录（不包括文件）
   */
  public getDirectoriesOnly(): FileInfo[] {
    return this.getAllFiles().filter((file) => file.isDirectory);
  }

  /**
   * 获取所有代码文件
   */
  public getCodeFiles(): FileInfo[] {
    return this.getFilesOnly().filter((file) => this.isCodeFile(file.filePath));
  }

  /**
   * 设置是否只遍历代码文件
   */
  public setCodeOnly(codeOnly: boolean): void {
    this.codeOnly = codeOnly;
  }

  /**
   * 打印所有文件信息
   */
  public printAllFiles(): void {
    const files = this.getAllFiles();
    console.log(`\n工作区: ${this.path}`);
    console.log(`总共找到 ${files.length} 个文件/目录:\n`);

    files.forEach((file) => {
      const type = file.isDirectory ? "[目录]" : "[文件]";
      console.log(`${type} ${file.relativePath}`);
    });

    const fileCount = files.filter((f) => !f.isDirectory).length;
    const dirCount = files.filter((f) => f.isDirectory).length;
    console.log(`\n统计: ${fileCount} 个文件, ${dirCount} 个目录`);
  }

  /**
   * 构建代码索引（Merkle 树）
   */
  public buildCodeIndex(chunkConfig?: Partial<ChunkConfig>): MerkleTreeStats {
    console.log("\n=== 开始构建代码索引 ===\n");

    // 获取所有代码文件
    const codeFiles = this.getCodeFiles();
    console.log(`找到 ${codeFiles.length} 个代码文件`);

    // 创建 Merkle 树
    this.merkle = new Merkle(this.path, chunkConfig);

    // 构建树
    const stats = this.merkle.build(codeFiles);

    console.log("\n=== 代码索引构建完成 ===\n");

    return stats;
  }

  /**
   * 获取 Merkle 树实例
   */
  public getMerkle(): Merkle | null {
    return this.merkle;
  }

  /**
   * 获取所有代码块
   */
  public getAllCodeChunks(): CodeChunk[] {
    if (!this.merkle) {
      throw new Error("代码索引未构建，请先调用 buildCodeIndex()");
    }
    return this.merkle.getAllChunks();
  }

  /**
   * 根据文件路径获取代码块
   */
  public getCodeChunksByFile(relativePath: string): CodeChunk[] | undefined {
    if (!this.merkle) {
      throw new Error("代码索引未构建，请先调用 buildCodeIndex()");
    }
    return this.merkle.getChunksByFile(relativePath);
  }

  /**
   * 搜索代码块
   */
  public searchCodeChunks(
    query: string,
    caseSensitive: boolean = false
  ): CodeChunk[] {
    if (!this.merkle) {
      throw new Error("代码索引未构建，请先调用 buildCodeIndex()");
    }
    return this.merkle.searchChunks(query, caseSensitive);
  }

  /**
   * 验证代码索引的完整性
   */
  public verifyCodeIndex(): boolean {
    if (!this.merkle) {
      throw new Error("代码索引未构建，请先调用 buildCodeIndex()");
    }
    return this.merkle.verify();
  }

  /**
   * 获取代码索引统计信息
   */
  public getCodeIndexStats(): MerkleTreeStats | null {
    if (!this.merkle) {
      return null;
    }
    return this.merkle.getStats();
  }

  /**
   * 打印 Merkle 树结构
   */
  public printMerkleTree(): void {
    if (!this.merkle) {
      console.log("代码索引未构建");
      return;
    }
    this.merkle.printTree();
  }
}

export default Workspace;
