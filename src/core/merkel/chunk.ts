import crypto from "crypto";
import fs from "fs";
import { CodeChunk } from "@/core/merkel/types";
import { ChunkConfig } from "@/types/global";
import { DEFAULT_CHUNK_CONFIG } from "@/config/chunk";

/**
 * CodeChunker 类 - 负责将代码文件分割成 chunks
 */
export class CodeChunker {
  private config: ChunkConfig;

  constructor(config: Partial<ChunkConfig> = {}) {
    this.config = { ...DEFAULT_CHUNK_CONFIG, ...config };
  }

  /**
   * 计算字符串的 SHA256 哈希
   */
  private hash(content: string): string {
    return crypto.createHash("sha256").update(content, "utf-8").digest("hex");
  }

  /**
   * 生成 chunk ID
   */
  private generateChunkId(
    filePath: string,
    startLine: number,
    endLine: number
  ): string {
    return `${filePath}:${startLine}-${endLine}`;
  }

  /**
   * 将文件内容分割成行
   */
  private splitIntoLines(content: string): string[] {
    return content.split("\n");
  }

  /**
   * 将文件分割成 chunks
   */
  public chunkFile(
    filePath: string,
    relativePath: string,
    content?: string
  ): CodeChunk[] {
    // 如果没有提供内容，从文件读取
    const fileContent = content || fs.readFileSync(filePath, "utf-8");
    const lines = this.splitIntoLines(fileContent);
    const chunks: CodeChunk[] = [];

    let currentLine = 0;
    let currentChunkLines: string[] = [];
    let chunkStartLine = 1;

    for (let i = 0; i < lines.length; i++) {
      currentChunkLines.push(lines[i]);
      currentLine++;

      const currentSize = Buffer.byteLength(
        currentChunkLines.join("\n"),
        "utf-8"
      );

      // 如果达到最大大小，或者是最后一行
      if (currentSize >= this.config.maxChunkSize || i === lines.length - 1) {
        // 只有当 chunk 大小超过最小大小时才创建
        if (currentSize >= this.config.minChunkSize || i === lines.length - 1) {
          const chunkContent = currentChunkLines.join("\n");
          const chunkEndLine = chunkStartLine + currentChunkLines.length - 1;

          chunks.push({
            id: this.generateChunkId(
              relativePath,
              chunkStartLine,
              chunkEndLine
            ),
            filePath,
            relativePath,
            content: chunkContent,
            startLine: chunkStartLine,
            endLine: chunkEndLine,
            hash: this.hash(chunkContent),
            size: Buffer.byteLength(chunkContent, "utf-8"),
          });

          // 保留重叠行
          const overlapStart = Math.max(
            0,
            currentChunkLines.length - this.config.overlapLines
          );
          currentChunkLines = currentChunkLines.slice(overlapStart);
          chunkStartLine = chunkEndLine - this.config.overlapLines + 1;
        } else {
          // 如果太小，继续累积
          continue;
        }
      }
    }

    // 如果最后还有剩余的小块，合并到最后一个 chunk
    if (currentChunkLines.length > 0 && chunks.length > 0) {
      const lastChunk = chunks[chunks.length - 1];
      const additionalContent = currentChunkLines.join("\n");
      lastChunk.content += "\n" + additionalContent;
      lastChunk.endLine += currentChunkLines.length;
      lastChunk.hash = this.hash(lastChunk.content);
      lastChunk.size = Buffer.byteLength(lastChunk.content, "utf-8");
      lastChunk.id = this.generateChunkId(
        relativePath,
        lastChunk.startLine,
        lastChunk.endLine
      );
    }

    return chunks;
  }

  /**
   * 批量处理多个文件
   */
  public chunkFiles(
    files: Array<{ filePath: string; relativePath: string; content?: string }>
  ): Map<string, CodeChunk[]> {
    const result = new Map<string, CodeChunk[]>();

    for (const file of files) {
      try {
        const chunks = this.chunkFile(
          file.filePath,
          file.relativePath,
          file.content
        );
        result.set(file.relativePath, chunks);
      } catch (error) {
        console.error(`分块文件失败 ${file.relativePath}:`, error);
      }
    }

    return result;
  }

  /**
   * 获取配置
   */
  public getConfig(): ChunkConfig {
    return { ...this.config };
  }

  /**
   * 更新配置
   */
  public updateConfig(config: Partial<ChunkConfig>): void {
    this.config = { ...this.config, ...config };
  }
}
