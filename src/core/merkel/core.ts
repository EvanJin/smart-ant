import fs from "fs";
import { CodeChunker } from "@/core/merkel/chunk";
import { MerkleNode } from "@/core/merkel/node";
import { CodeChunk, MerkleTreeStats } from "@/core/merkel/types";
import { FileInfo } from "@/core/workspace/types";
import { ChunkConfig } from "@/types/global";

/**
 * Merkle 类 - 管理代码库的 Merkle 树
 */
/**
 * Merkle 类 - 管理代码库的 Merkle 树
 *
 * 该类负责构建和管理代码库的 Merkle 树结构，提供代码分块、索引和检索功能。
 * 主要功能包括：
 * - 将代码文件分块并构建 Merkle 树
 * - 管理和检索代码块
 * - 验证树的完整性
 * - 提供搜索和统计功能
 */
export default class Merkle {
  /** 代码库根路径 */
  private rootPath: string;

  /** Merkle 树的根节点 */
  private tree: MerkleNode | null = null;

  /** 代码分块器实例 */
  private chunker: CodeChunker;

  /** 存储所有代码块的映射表，key 为文件相对路径，value 为该文件的所有代码块 */
  private chunks: Map<string, CodeChunk[]> = new Map();

  /** 构建统计信息 */
  private buildStats: MerkleTreeStats | null = null;

  /**
   * 构造函数
   * @param rootPath - 代码库根路径
   * @param chunkConfig - 可选的分块配置参数
   */
  constructor(rootPath: string, chunkConfig?: Partial<ChunkConfig>) {
    this.rootPath = rootPath;
    this.chunker = new CodeChunker(chunkConfig);
  }

  /**
   * 构建 Merkle 树
   *
   * 遍历所有文件，对每个文件进行分块，然后构建 Merkle 树结构。
   * 树的结构为：根节点 -> 文件节点 -> 代码块节点
   *
   * @param files - 要处理的文件列表
   * @returns 构建统计信息，包括文件数、代码块数、总大小等
   */
  public build(files: FileInfo[]): MerkleTreeStats {
    const startTime = Date.now();
    console.log(`开始构建 Merkle 树，共 ${files.length} 个文件...`);

    // 清空之前的数据
    this.chunks.clear();

    // 为每个文件创建文件节点
    const fileNodes: MerkleNode[] = [];
    let totalChunks = 0;
    let totalSize = 0;

    for (const file of files) {
      try {
        // 读取文件内容
        const content = fs.readFileSync(file.filePath, "utf-8");

        // 分块
        const fileChunks = this.chunker.chunkFile(
          file.filePath,
          file.relativePath,
          content
        );

        if (fileChunks.length === 0) {
          continue;
        }

        // 保存 chunks
        this.chunks.set(file.relativePath, fileChunks);

        // 创建 chunk 节点
        const chunkNodes = fileChunks.map(
          (chunk) => new MerkleNode("chunk", [], chunk)
        );

        // 创建文件节点
        const fileNode = new MerkleNode(
          "file",
          chunkNodes,
          undefined,
          file.relativePath
        );

        fileNodes.push(fileNode);

        totalChunks += fileChunks.length;
        totalSize += fileChunks.reduce((sum, chunk) => sum + chunk.size, 0);

        console.log(
          `  处理文件: ${file.relativePath} (${fileChunks.length} chunks)`
        );
      } catch (error) {
        console.error(`处理文件失败 ${file.relativePath}:`, error);
      }
    }

    // 创建根节点
    this.tree = new MerkleNode("root", fileNodes);

    const buildTime = Date.now() - startTime;

    this.buildStats = {
      totalFiles: files.length,
      totalChunks: totalChunks,
      totalSize: totalSize,
      rootHash: this.tree.hash,
      buildTime: buildTime,
    };

    console.log(`\nMerkle 树构建完成！`);
    console.log(`  总文件数: ${files.length}`);
    console.log(`  总 chunk 数: ${totalChunks}`);
    console.log(`  总大小: ${(totalSize / 1024).toFixed(2)} KB`);
    console.log(`  根哈希: ${this.tree.hash.substring(0, 16)}...`);
    console.log(`  构建时间: ${buildTime}ms`);

    return this.buildStats;
  }

  /**
   * 获取根节点
   * @returns Merkle 树的根节点，如果树未构建则返回 null
   */
  public getRoot(): MerkleNode | null {
    return this.tree;
  }

  /**
   * 获取所有代码块
   *
   * 将所有文件的代码块合并到一个数组中返回
   *
   * @returns 所有代码块的数组
   */
  public getAllChunks(): CodeChunk[] {
    const allChunks: CodeChunk[] = [];
    for (const chunks of this.chunks.values()) {
      allChunks.push(...chunks);
    }
    return allChunks;
  }

  /**
   * 根据文件路径获取代码块
   *
   * @param relativePath - 文件的相对路径
   * @returns 该文件的所有代码块，如果文件不存在则返回 undefined
   */
  public getChunksByFile(relativePath: string): CodeChunk[] | undefined {
    return this.chunks.get(relativePath);
  }

  /**
   * 根据 chunk ID 查找代码块
   *
   * 遍历所有代码块，查找匹配指定 ID 的代码块
   *
   * @param chunkId - 代码块的唯一标识符
   * @returns 找到的代码块，如果不存在则返回 undefined
   */
  public findChunk(chunkId: string): CodeChunk | undefined {
    for (const chunks of this.chunks.values()) {
      const chunk = chunks.find((c) => c.id === chunkId);
      if (chunk) {
        return chunk;
      }
    }
    return undefined;
  }

  /**
   * 搜索包含指定内容的代码块
   *
   * 在所有代码块中搜索包含指定查询字符串的代码块
   *
   * @param query - 搜索查询字符串
   * @param caseSensitive - 是否区分大小写，默认为 false
   * @returns 包含查询字符串的所有代码块
   */
  public searchChunks(
    query: string,
    caseSensitive: boolean = false
  ): CodeChunk[] {
    const results: CodeChunk[] = [];
    const searchQuery = caseSensitive ? query : query.toLowerCase();

    for (const chunks of this.chunks.values()) {
      for (const chunk of chunks) {
        const content = caseSensitive
          ? chunk.content
          : chunk.content.toLowerCase();
        if (content.includes(searchQuery)) {
          results.push(chunk);
        }
      }
    }

    return results;
  }

  /**
   * 验证 Merkle 树的完整性
   *
   * 通过验证所有节点的哈希值来确保树的完整性
   *
   * @returns 如果树有效返回 true，否则返回 false
   */
  public verify(): boolean {
    if (!this.tree) {
      console.error("Merkle 树未构建");
      return false;
    }

    const isValid = this.tree.verify();
    if (isValid) {
      console.log("✓ Merkle 树验证通过");
    } else {
      console.error("✗ Merkle 树验证失败");
    }

    return isValid;
  }

  /**
   * 获取构建统计信息
   *
   * @returns 构建统计信息，如果树未构建则返回 null
   */
  public getStats(): MerkleTreeStats | null {
    return this.buildStats;
  }

  /**
   * 打印树结构
   *
   * 以可视化的方式在控制台打印 Merkle 树的结构
   */
  public printTree(): void {
    if (!this.tree) {
      console.log("Merkle 树未构建");
      return;
    }

    console.log("\nMerkle 树结构:");
    this.tree.printTree();
  }

  /**
   * 导出为 JSON 格式
   *
   * 将 Merkle 树及其统计信息导出为 JSON 对象
   *
   * @returns 包含根路径、树结构和统计信息的对象
   */
  public toJSON(): object {
    return {
      rootPath: this.rootPath,
      tree: this.tree?.toJSON(),
      stats: this.buildStats,
    };
  }

  /**
   * 获取代码分块器实例
   *
   * @returns CodeChunker 实例
   */
  public getChunker(): CodeChunker {
    return this.chunker;
  }

  /**
   * 更新单个文件
   *
   * 重新处理指定文件，更新其代码块
   *
   * @param file 文件信息
   */
  public updateFile(file: FileInfo): void {
    try {
      // 读取文件内容
      const content = fs.readFileSync(file.filePath, "utf-8");

      // 分块
      const fileChunks = this.chunker.chunkFile(
        file.filePath,
        file.relativePath,
        content
      );

      if (fileChunks.length === 0) {
        console.warn(`文件分块为空: ${file.relativePath}`);
        return;
      }

      // 更新 chunks 映射
      this.chunks.set(file.relativePath, fileChunks);

      console.log(
        `更新文件: ${file.relativePath}, ${fileChunks.length} 个 chunks`
      );
    } catch (error) {
      console.error(`更新文件失败: ${file.relativePath}`, error);
    }
  }

  /**
   * 删除文件的所有 chunks
   *
   * @param relativePath 文件相对路径
   */
  public removeFile(relativePath: string): void {
    if (this.chunks.has(relativePath)) {
      const removedChunks = this.chunks.get(relativePath);
      this.chunks.delete(relativePath);
      console.log(
        `删除文件: ${relativePath}, ${removedChunks?.length || 0} 个 chunks`
      );
    } else {
      console.warn(`文件不存在: ${relativePath}`);
    }
  }

  /**
   * 重新计算根哈希
   *
   * 在增量更新后重新计算整个树的根哈希
   */
  public recalculateRootHash(): void {
    const crypto = require("crypto");

    // 收集所有文件的哈希
    const fileHashes: string[] = [];

    for (const [_, chunks] of this.chunks.entries()) {
      // 计算文件的哈希（所有 chunk 哈希的组合）
      const chunkHashes = chunks.map((c) => c.hash).join("");
      const fileHash = crypto
        .createHash("sha256")
        .update(chunkHashes)
        .digest("hex");
      fileHashes.push(fileHash);
    }

    // 计算新的根哈希
    const rootHash = crypto
      .createHash("sha256")
      .update(fileHashes.sort().join(""))
      .digest("hex");

    // 更新统计信息
    if (this.buildStats) {
      this.buildStats.rootHash = rootHash;
      this.buildStats.totalFiles = this.chunks.size;
      this.buildStats.totalChunks = Array.from(this.chunks.values()).reduce(
        (sum, chunks) => sum + chunks.length,
        0
      );
      this.buildStats.totalSize = Array.from(this.chunks.values())
        .flat()
        .reduce((sum, chunk) => sum + chunk.size, 0);
    }

    console.log(`重新计算根哈希: ${rootHash.substring(0, 16)}...`);
  }
}
