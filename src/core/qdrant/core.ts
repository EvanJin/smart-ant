import { QdrantClient } from "@qdrant/js-client-rest";
import { CodeChunk } from "@/core/merkel/types";
import crypto from "crypto";

/**
 * Qdrant 配置接口
 */
export interface QdrantConfig {
  url?: string;
  apiKey?: string;
  collectionName?: string;
  vectorSize?: number;
  batchSize?: number;
}

/**
 * 批量插入结果
 */
export interface BatchInsertResult {
  success: number;
  failed: number;
  errors: Array<{ chunkId: string; error: string }>;
}

class QdrantCoreClient {
  private client: QdrantClient;
  private collectionName: string = "smart-ant-code-chunks";
  private vectorSize: number = 1536; // text-embedding-3-small 的维度
  private batchSize: number = 100; // 每批次处理的数量
  private isInitialized: boolean = false;

  constructor(config?: QdrantConfig) {
    this.client = new QdrantClient({
      url:
        config?.url ||
        "***REMOVED***",
      apiKey:
        config?.apiKey ||
        "***REMOVED***",
    });

    if (config?.collectionName) {
      this.collectionName = config.collectionName;
    }
    if (config?.vectorSize) {
      this.vectorSize = config.vectorSize;
    }
    if (config?.batchSize) {
      this.batchSize = config.batchSize;
    }
  }

  /**
   * 初始化（创建集合）
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      await this.createCollection();
      this.isInitialized = true;
      console.log("Qdrant 客户端初始化成功");
    } catch (error) {
      console.error("Qdrant 客户端初始化失败:", error);
      throw error;
    }
  }

  /**
   * 创建集合
   */
  private async createCollection(): Promise<void> {
    try {
      const collections = await this.client.getCollections();
      const exists = collections.collections.find(
        (c) => c.name === this.collectionName
      );

      if (exists) {
        console.log(`集合 ${this.collectionName} 已存在`);
        return;
      }

      await this.client.createCollection(this.collectionName, {
        vectors: {
          size: this.vectorSize,
          distance: "Cosine",
        },
      });

      console.log(`集合 ${this.collectionName} 创建成功`);
    } catch (error) {
      console.error("创建集合失败:", error);
      throw error;
    }
  }

  /**
   * 生成 UUID（从字符串 ID）
   */
  private generateUUID(id: string): string {
    const hash = crypto.createHash("md5").update(id).digest("hex");
    return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(
      12,
      16
    )}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`;
  }

  /**
   * 批量插入代码块
   * @param chunks - 代码块列表
   * @returns 插入结果
   */
  public async batchInsertChunks(
    chunks: CodeChunk[]
  ): Promise<BatchInsertResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const result: BatchInsertResult = {
      success: 0,
      failed: 0,
      errors: [],
    };

    // 过滤掉没有 embedding 的 chunks
    const validChunks = chunks.filter((chunk) => {
      if (!chunk.embedding || chunk.embedding.length === 0) {
        result.failed++;
        result.errors.push({
          chunkId: chunk.id,
          error: "缺少 embedding",
        });
        return false;
      }
      if (chunk.embedding.length !== this.vectorSize) {
        result.failed++;
        result.errors.push({
          chunkId: chunk.id,
          error: `embedding 维度不匹配: 期望 ${this.vectorSize}, 实际 ${chunk.embedding.length}`,
        });
        return false;
      }
      return true;
    });

    if (validChunks.length === 0) {
      console.warn("没有有效的代码块可以插入");
      return result;
    }

    console.log(
      `准备插入 ${validChunks.length} 个代码块（共 ${chunks.length} 个）`
    );

    // 分批处理
    for (let i = 0; i < validChunks.length; i += this.batchSize) {
      const batch = validChunks.slice(i, i + this.batchSize);
      const batchNumber = Math.floor(i / this.batchSize) + 1;
      const totalBatches = Math.ceil(validChunks.length / this.batchSize);

      console.log(
        `处理批次 ${batchNumber}/${totalBatches} (${batch.length} 个代码块)`
      );

      try {
        await this.insertBatch(batch);
        result.success += batch.length;
        console.log(`批次 ${batchNumber} 插入成功`);
      } catch (error) {
        console.error(`批次 ${batchNumber} 插入失败:`, error);
        result.failed += batch.length;
        batch.forEach((chunk) => {
          result.errors.push({
            chunkId: chunk.id,
            error: error instanceof Error ? error.message : String(error),
          });
        });
      }
    }

    console.log(`批量插入完成: 成功 ${result.success}, 失败 ${result.failed}`);
    return result;
  }

  /**
   * 插入单个批次
   */
  private async insertBatch(chunks: CodeChunk[]): Promise<void> {
    const points = chunks.map((chunk) => ({
      id: this.generateUUID(chunk.id),
      vector: chunk.embedding,
      payload: {
        id: chunk.id,
        filePath: chunk.filePath,
        relativePath: chunk.relativePath,
        content: chunk.content,
        startLine: chunk.startLine,
        endLine: chunk.endLine,
        hash: chunk.hash,
        size: chunk.size,
      },
    }));

    await this.client.upsert(this.collectionName, {
      wait: true,
      points: points,
    });
  }

  /**
   * 获取集合信息
   */
  public async getCollectionInfo(): Promise<any> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      return await this.client.getCollection(this.collectionName);
    } catch (error) {
      console.error("获取集合信息失败:", error);
      throw error;
    }
  }
}

export default new QdrantCoreClient();
