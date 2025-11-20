import { QdrantClient } from "@qdrant/js-client-rest";
import { CodeChunk } from "@/core/merkel/types";
import { FileChange, FileChangeType } from "@/core/workspace/types";
import crypto from "crypto";
import { camelCase } from "lodash";
import { inject, injectable } from "inversify";
import { ConfigContainer } from "@/core/config";
import { BatchInsertResult } from "./types";

@injectable()
export class QdrantCoreClient {
  /**
   * Qdrant 客户端
   */
  private client: QdrantClient;

  /**
   * 集合名称
   */
  private collectionName: string = "smart-ant-code-chunks";

  /**
   * 向量维度
   */
  private vectorSize: number = 1536; // text-embedding-3-small 的维度

  /**
   * 每批次处理的数量
   */
  private batchSize: number = 100;

  /**
   * 是否已初始化
   */
  private isInitialized: boolean = false;

  /**
   * 仓库名称
   */
  private repo: string | undefined;

  constructor(
    @inject(ConfigContainer) private readonly configContainer: ConfigContainer
  ) {
    this.client = new QdrantClient({
      url: this.configContainer.config.qdrantUrl,
      apiKey: this.configContainer.config.qdrantApiKey,
    });
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
   * 设置集合名称
   * @param name - 集合名称
   */
  public setCollectionName(name: string): void {
    this.collectionName = name;
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
        await this.ensurePayloadIndex();
        return;
      }

      await this.client.createCollection(this.collectionName, {
        vectors: {
          size: this.vectorSize,
          distance: "Cosine",
        },
        // 配置优化器，自动为常用字段创建索引
        optimizers_config: {
          indexing_threshold: 10000,
        },
        on_disk_payload: false,
      });

      console.log(`集合 ${this.collectionName} 创建成功`);

      // 创建索引
      await this.ensurePayloadIndex();
    } catch (error) {
      console.error("创建集合失败:", error);
      throw error;
    }
  }

  /**
   * 确保 payload 索引存在
   * 为常用的查询字段创建索引以提高查询性能
   * 包括: id, relative_path, file_path, hash
   */
  private async ensurePayloadIndex(): Promise<void> {
    const keys = ["id", "relative_path", "file_path", "hash"];
    const promises = [];
    for (const key of keys) {
      promises.push(
        this.client.createPayloadIndex(this.collectionName, {
          field_name: key,
          field_schema: "keyword",
        })
      );
    }

    Promise.all(promises)
      .then((results) => {
        return results.map((result) => result.status === "acknowledged");
      })
      .catch((error) => {
        console.error("创建 payload 索引失败:", error);
        throw error;
      });
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
        file_path: chunk.filePath,
        relative_path: chunk.relativePath,
        content: chunk.content,
        start_line: chunk.startLine,
        end_line: chunk.endLine,
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

  /**
   * 搜索相似代码块
   * @param embedding - 查询向量
   * @param limit - 返回结果数量
   * @returns 相似的代码块
   */
  public async searchSimilar(
    embedding: number[],
    limit: number = 10
  ): Promise<CodeChunk[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const results = await this.client.search(this.collectionName, {
        vector: embedding,
        limit: limit,
        with_payload: true,
      });

      return results.map((result) => result.payload as unknown as CodeChunk);
    } catch (error) {
      console.error("搜索失败:", error);
      throw error;
    }
  }

  /**
   * 根据文本查询相似代码块
   * @param query - 查询文本
   * @param limit - 返回结果数量
   * @param generateEmbedding - 生成嵌入的函数
   * @returns 相似的代码块及其相似度分数
   */
  public async searchByText(
    query: string,
    limit: number = 10,
    generateEmbedding: (text: string) => Promise<number[]>
  ): Promise<Array<{ chunk: CodeChunk; score: number }>> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // 生成查询文本的嵌入向量
      console.log(`正在为查询文本生成嵌入: "${query}"`);
      const queryEmbedding = await generateEmbedding(query);

      // 搜索相似代码块
      const results = await this.client.search(this.collectionName, {
        vector: queryEmbedding,
        limit: limit,
        with_payload: true,
        with_vector: false,
      });

      return results.map((result) => ({
        chunk: Object.keys(result.payload || {}).reduce(
          (acc, key) => ({ ...acc, [camelCase(key)]: result.payload?.[key] }),
          {} as CodeChunk
        ),
        score: result.score || 0,
      }));
    } catch (error) {
      console.error("文本搜索失败:", error);
      throw error;
    }
  }

  /**
   * 根据文件路径搜索代码块
   * @param relativePath - 相对路径
   * @returns 代码块列表
   */
  public async searchByFile(relativePath: string): Promise<CodeChunk[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const results = await this.client.scroll(this.collectionName, {
        filter: {
          must: [
            {
              key: "relativePath",
              match: {
                value: relativePath,
              },
            },
          ],
        },
        limit: 100,
        with_payload: true,
      });

      return results.points.map(
        (point) => point.payload as unknown as CodeChunk
      );
    } catch (error) {
      console.error("按文件搜索失败:", error);
      throw error;
    }
  }

  /**
   * 混合搜索：结合语义搜索和关键词过滤
   * @param query - 查询文本
   * @param filters - 过滤条件（如文件路径、语言等）
   * @param limit - 返回结果数量
   * @param generateEmbedding - 生成嵌入的函数
   * @returns 搜索结果
   */
  public async hybridSearch(
    query: string,
    filters: {
      filePath?: string;
      minLine?: number;
      maxLine?: number;
    },
    limit: number = 10,
    generateEmbedding: (text: string) => Promise<number[]>
  ): Promise<Array<{ chunk: CodeChunk; score: number }>> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const queryEmbedding = await generateEmbedding(query);

      // 构建过滤条件
      const must: any[] = [];
      if (filters.filePath) {
        must.push({
          key: "relativePath",
          match: {
            value: filters.filePath,
          },
        });
      }
      if (filters.minLine !== undefined) {
        must.push({
          key: "startLine",
          range: {
            gte: filters.minLine,
          },
        });
      }
      if (filters.maxLine !== undefined) {
        must.push({
          key: "endLine",
          range: {
            lte: filters.maxLine,
          },
        });
      }

      const results = await this.client.search(this.collectionName, {
        vector: queryEmbedding,
        limit: limit,
        with_payload: true,
        filter: must.length > 0 ? { must } : undefined,
      });

      return results.map((result) => ({
        chunk: result.payload as unknown as CodeChunk,
        score: result.score || 0,
      }));
    } catch (error) {
      console.error("混合搜索失败:", error);
      throw error;
    }
  }

  /**
   * 获取配置
   */
  public getConfig() {
    return {
      collectionName: this.collectionName,
      vectorSize: this.vectorSize,
      batchSize: this.batchSize,
      isInitialized: this.isInitialized,
    };
  }

  /**
   * 清空集合
   */
  public async clearCollection(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      await this.client.deleteCollection(this.collectionName);
      this.isInitialized = false;
      await this.initialize();
      console.log(`集合 ${this.collectionName} 已清空并重新创建`);
    } catch (error) {
      console.error("清空集合失败:", error);
      throw error;
    }
  }

  /**
   * 删除指定文件的所有代码块
   * @param relativePath 文件相对路径
   * @returns 删除的数量
   */
  public async deleteChunksByFile(relativePath: string): Promise<number> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      console.log(`删除文件的代码块: ${relativePath}`);

      // 先查询要删除的点
      const searchResult = await this.client.scroll(this.collectionName, {
        filter: {
          must: [
            {
              key: "relative_path",
              match: {
                value: relativePath,
              },
            },
          ],
        },
        limit: 1000, // 假设单个文件不会超过 1000 个 chunks
        with_payload: false,
        with_vector: false,
      });

      if (searchResult.points.length === 0) {
        console.log(`没有找到文件的代码块: ${relativePath}`);
        return 0;
      }

      // 提取所有点的 ID
      const pointIds = searchResult.points.map((point) => point.id);

      console.log(
        `找到 ${pointIds.length} 个代码块，准备删除: ${relativePath}`
      );

      // 使用点 ID 删除
      await this.client.delete(this.collectionName, {
        points: pointIds,
        wait: true,
      });

      console.log(`删除完成: ${relativePath}, 共 ${pointIds.length} 个代码块`);
      return pointIds.length;
    } catch (error) {
      console.error(`删除文件代码块失败: ${relativePath}`, error);
      throw error;
    }
  }

  /**
   * 增量更新代码块
   * @param changes 文件变更列表
   * @param getChunksByFile 获取文件代码块的函数
   * @returns 更新结果
   */
  public async incrementalUpdate(
    changes: FileChange[],
    getChunksByFile: (relativePath: string) => CodeChunk[] | undefined
  ): Promise<{
    deleted: number;
    inserted: number;
    errors: Array<{ file: string; error: string }>;
  }> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const result = {
      deleted: 0,
      inserted: 0,
      errors: [] as Array<{ file: string; error: string }>,
    };

    for (const change of changes) {
      try {
        switch (change.changeType) {
          case FileChangeType.DELETED:
            // 删除文件的所有 chunks
            const deleteCount = await this.deleteChunksByFile(
              change.relativePath
            );
            result.deleted += deleteCount;
            break;

          case FileChangeType.MODIFIED:
            // 先删除旧的 chunks
            await this.deleteChunksByFile(change.relativePath);
            result.deleted++;

            // 然后插入新的 chunks
            const modifiedChunks = getChunksByFile(change.relativePath);
            if (modifiedChunks && modifiedChunks.length > 0) {
              const insertResult = await this.batchInsertChunks(modifiedChunks);
              result.inserted += insertResult.success;
              result.errors.push(
                ...insertResult.errors.map((e) => ({
                  file: change.relativePath,
                  error: e.error,
                }))
              );
            }
            break;

          case FileChangeType.ADDED:
            // 插入新文件的 chunks
            const addedChunks = getChunksByFile(change.relativePath);
            if (addedChunks && addedChunks.length > 0) {
              const insertResult = await this.batchInsertChunks(addedChunks);
              result.inserted += insertResult.success;
              result.errors.push(
                ...insertResult.errors.map((e) => ({
                  file: change.relativePath,
                  error: e.error,
                }))
              );
            }
            break;
        }
      } catch (error) {
        result.errors.push({
          file: change.relativePath,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    console.log(
      `增量更新完成: 删除 ${result.deleted} 个文件, 插入 ${result.inserted} 个 chunks`
    );

    return result;
  }
}
