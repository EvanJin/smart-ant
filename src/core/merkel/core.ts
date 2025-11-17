import fs from "fs";
import { CodeChunker } from "@/core/merkel/chunk";
import { MerkleNode } from "@/core/merkel/node";
import { CodeChunk, MerkleTreeStats } from "@/core/merkel/types";
import { FileInfo } from "@/core/workspace/types";
import { ChunkConfig } from "@/types/global";

/**
 * Merkle 类 - 管理代码库的 Merkle 树
 */
class Merkle {
  private rootPath: string;
  private tree: MerkleNode | null = null;
  private chunker: CodeChunker;
  private chunks: Map<string, CodeChunk[]> = new Map();
  private buildStats: MerkleTreeStats | null = null;

  constructor(rootPath: string, chunkConfig?: Partial<ChunkConfig>) {
    this.rootPath = rootPath;
    this.chunker = new CodeChunker(chunkConfig);
  }

  /**
   * 构建 Merkle 树
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
      totalChunks,
      totalSize,
      rootHash: this.tree.hash,
      buildTime,
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
   */
  public getRoot(): MerkleNode | null {
    return this.tree;
  }

  /**
   * 获取所有 chunks
   */
  public getAllChunks(): CodeChunk[] {
    const allChunks: CodeChunk[] = [];
    for (const chunks of this.chunks.values()) {
      allChunks.push(...chunks);
    }
    return allChunks;
  }

  /**
   * 根据文件路径获取 chunks
   */
  public getChunksByFile(relativePath: string): CodeChunk[] | undefined {
    return this.chunks.get(relativePath);
  }

  /**
   * 根据 chunk ID 查找 chunk
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
   * 搜索包含指定内容的 chunks
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
   */
  public getStats(): MerkleTreeStats | null {
    return this.buildStats;
  }

  /**
   * 打印树结构
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
   * 导出为 JSON
   */
  public toJSON(): object {
    return {
      rootPath: this.rootPath,
      tree: this.tree?.toJSON(),
      stats: this.buildStats,
    };
  }

  /**
   * 获取 chunker 实例
   */
  public getChunker(): CodeChunker {
    return this.chunker;
  }
}

export default Merkle;
