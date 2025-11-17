# Qdrant 向量数据库集成

## 概述

Smart Ant 集成了 Qdrant 向量数据库，用于存储和检索代码块的文本嵌入向量，实现语义搜索功能。

## 功能特性

### ✅ 批量插入
- 自动分批处理（默认每批 100 个）
- 错误处理和重试机制
- 详细的插入结果统计

### ✅ 向量搜索
- 语义相似度搜索
- 按文件路径过滤
- 可配置返回结果数量

### ✅ 数据管理
- 自动创建集合
- 清空集合数据
- 获取集合信息

## 核心类

### QdrantCoreClient

```typescript
class QdrantCoreClient {
  // 初始化
  async initialize(): Promise<void>
  
  // 批量插入代码块
  async batchInsertChunks(chunks: CodeChunk[]): Promise<BatchInsertResult>
  
  // 搜索相似代码块
  async searchSimilar(embedding: number[], limit?: number): Promise<CodeChunk[]>
  
  // 按文件搜索
  async searchByFile(relativePath: string): Promise<CodeChunk[]>
  
  // 清空集合
  async clearCollection(): Promise<void>
  
  // 获取集合信息
  async getCollectionInfo(): Promise<any>
  
  // 获取配置
  getConfig(): QdrantConfig
}
```

## 配置

### 默认配置

```typescript
{
  url: "***REMOVED***",
  apiKey: "...",
  collectionName: "smart-ant-code-chunks",
  vectorSize: 1536,  // text-embedding-3-small 的维度
  batchSize: 100     // 每批次处理数量
}
```

### 自定义配置

```typescript
import { QdrantClient } from "@/core/qdrant";

// 使用自定义配置创建实例
const client = new QdrantCoreClient({
  url: "http://localhost:6333",
  apiKey: "your-api-key",
  collectionName: "my-collection",
  vectorSize: 1536,
  batchSize: 50,
});
```

## 使用示例

### 示例 1: 批量插入代码块

```typescript
import { QdrantClient } from "@/core/qdrant";
import { OpenAIClient } from "@/core/openai";

// 1. 生成代码块的嵌入向量
const chunks = workspace.getAllCodeChunks();

for (const chunk of chunks) {
  const embedding = await OpenAIClient.initialize().createEmbedding(
    chunk.content
  );
  chunk.embedding = embedding;
}

// 2. 批量插入到 Qdrant
const result = await QdrantClient.batchInsertChunks(chunks);

console.log(`成功插入: ${result.success} 个`);
console.log(`失败: ${result.failed} 个`);

if (result.errors.length > 0) {
  console.log("错误详情:", result.errors);
}
```

### 示例 2: 语义搜索

```typescript
import { QdrantClient } from "@/core/qdrant";
import { OpenAIClient } from "@/core/openai";

// 1. 生成查询文本的嵌入
const query = "如何实现文件上传功能";
const queryEmbedding = await OpenAIClient.initialize().createEmbedding(query);

// 2. 搜索相似代码块
const similarChunks = await QdrantClient.searchSimilar(queryEmbedding, 10);

console.log(`找到 ${similarChunks.length} 个相似代码块:`);
similarChunks.forEach((chunk, idx) => {
  console.log(`\n[${idx + 1}] ${chunk.relativePath}`);
  console.log(`  行 ${chunk.startLine}-${chunk.endLine}`);
  console.log(`  ${chunk.content.substring(0, 100)}...`);
});
```

### 示例 3: 按文件搜索

```typescript
import { QdrantClient } from "@/core/qdrant";

// 搜索特定文件的所有代码块
const chunks = await QdrantClient.searchByFile("src/extension.ts");

console.log(`文件 src/extension.ts 包含 ${chunks.length} 个代码块`);
chunks.forEach((chunk) => {
  console.log(`  行 ${chunk.startLine}-${chunk.endLine}: ${chunk.size}B`);
});
```

### 示例 4: 清空集合

```typescript
import { QdrantClient } from "@/core/qdrant";

// 清空所有数据并重新创建集合
await QdrantClient.clearCollection();
console.log("集合已清空");
```

### 示例 5: 获取集合信息

```typescript
import { QdrantClient } from "@/core/qdrant";

// 获取集合统计信息
const info = await QdrantClient.getCollectionInfo();

console.log("集合信息:");
console.log(`  名称: ${info.name}`);
console.log(`  向量数量: ${info.vectors_count}`);
console.log(`  索引大小: ${info.indexed_vectors_count}`);
console.log(`  向量维度: ${info.config.params.vectors.size}`);
```

## 批量插入详解

### 工作流程

1. **验证数据**
   - 检查每个 chunk 是否有 embedding
   - 验证 embedding 维度是否正确（1536）
   - 过滤掉无效的 chunks

2. **分批处理**
   - 将有效的 chunks 分成多个批次
   - 每批默认处理 100 个 chunks
   - 逐批插入到 Qdrant

3. **错误处理**
   - 记录每个失败的 chunk
   - 提供详细的错误信息
   - 不会因为单个批次失败而中断整个过程

4. **返回结果**
   ```typescript
   {
     success: 150,  // 成功插入的数量
     failed: 5,     // 失败的数量
     errors: [      // 错误详情
       { chunkId: "src/index.ts:1-50", error: "缺少 embedding" },
       { chunkId: "src/app.ts:10-60", error: "embedding 维度不匹配" }
     ]
   }
   ```

### 性能优化

#### 1. 调整批次大小

```typescript
// 小批次（适合网络不稳定的情况）
const client = new QdrantCoreClient({ batchSize: 50 });

// 大批次（适合稳定网络环境）
const client = new QdrantCoreClient({ batchSize: 200 });
```

#### 2. 并行生成嵌入

```typescript
// 使用 Promise.all 并行处理
const chunks = workspace.getAllCodeChunks();

// 分批并行处理（每批 10 个）
const batchSize = 10;
for (let i = 0; i < chunks.length; i += batchSize) {
  const batch = chunks.slice(i, i + batchSize);
  
  await Promise.all(
    batch.map(async (chunk) => {
      try {
        chunk.embedding = await OpenAIClient.initialize().createEmbedding(
          chunk.content
        );
      } catch (error) {
        console.error(`生成嵌入失败: ${chunk.id}`, error);
      }
    })
  );
  
  console.log(`已处理 ${Math.min(i + batchSize, chunks.length)}/${chunks.length}`);
}
```

#### 3. 增量更新

```typescript
// 只处理新增或修改的文件
const newChunks = workspace.getAllCodeChunks().filter((chunk) => {
  // 根据 hash 判断是否为新代码块
  return isNewOrModified(chunk.hash);
});

const result = await QdrantClient.batchInsertChunks(newChunks);
```

## 数据结构

### Point 结构

插入到 Qdrant 的每个 point 包含：

```typescript
{
  id: "uuid-generated-from-chunk-id",  // UUID
  vector: [0.123, 0.456, ...],         // 1536 维向量
  payload: {
    id: "src/index.ts:1-50",           // 原始 chunk ID
    filePath: "/path/to/file",         // 完整路径
    relativePath: "src/index.ts",      // 相对路径
    content: "...",                    // 代码内容
    startLine: 1,                      // 起始行
    endLine: 50,                       // 结束行
    hash: "abc123...",                 // SHA256 哈希
    size: 2048                         // 字节大小
  }
}
```

### ID 生成策略

- 使用 MD5 哈希 chunk.id 生成 UUID
- 保证相同的 chunk.id 总是生成相同的 UUID
- 支持幂等性插入（重复插入会覆盖旧数据）

## 错误处理

### 常见错误

1. **缺少 embedding**
   ```
   错误: 缺少 embedding
   原因: chunk.embedding 为 null 或 undefined
   解决: 确保在插入前生成嵌入向量
   ```

2. **embedding 维度不匹配**
   ```
   错误: embedding 维度不匹配: 期望 1536, 实际 768
   原因: 使用了不同的嵌入模型
   解决: 确保使用 text-embedding-3-small 模型
   ```

3. **网络连接失败**
   ```
   错误: Connection timeout
   原因: 无法连接到 Qdrant 服务器
   解决: 检查网络连接和 Qdrant 服务状态
   ```

4. **API Key 无效**
   ```
   错误: Unauthorized
   原因: API Key 错误或已过期
   解决: 更新正确的 API Key
   ```

### 错误恢复

```typescript
// 重试失败的 chunks
const result = await QdrantClient.batchInsertChunks(chunks);

if (result.failed > 0) {
  console.log(`有 ${result.failed} 个 chunks 插入失败，尝试重试...`);
  
  // 获取失败的 chunk IDs
  const failedIds = result.errors.map((e) => e.chunkId);
  
  // 重新尝试插入失败的 chunks
  const failedChunks = chunks.filter((c) => failedIds.includes(c.id));
  const retryResult = await QdrantClient.batchInsertChunks(failedChunks);
  
  console.log(`重试结果: 成功 ${retryResult.success}, 失败 ${retryResult.failed}`);
}
```

## 最佳实践

1. **初始化检查**
   ```typescript
   // 在使用前确保已初始化
   await QdrantClient.initialize();
   ```

2. **批量处理**
   ```typescript
   // 大量数据时使用批量插入，不要逐个插入
   await QdrantClient.batchInsertChunks(chunks);  // ✅
   
   // 避免
   for (const chunk of chunks) {
     await insertSingle(chunk);  // ❌ 慢且低效
   }
   ```

3. **错误日志**
   ```typescript
   // 记录详细的错误信息
   const result = await QdrantClient.batchInsertChunks(chunks);
   if (result.errors.length > 0) {
     fs.writeFileSync(
       "insert-errors.json",
       JSON.stringify(result.errors, null, 2)
     );
   }
   ```

4. **定期清理**
   ```typescript
   // 定期清理过期数据
   const oldChunks = await findOldChunks();
   await deleteChunks(oldChunks);
   ```

## 监控和调试

### 获取配置信息

```typescript
const config = QdrantClient.getConfig();
console.log("当前配置:", config);
// {
//   collectionName: "smart-ant-code-chunks",
//   vectorSize: 1536,
//   batchSize: 100,
//   isInitialized: true
// }
```

### 查看集合状态

```typescript
const info = await QdrantClient.getCollectionInfo();
console.log("集合状态:", info);
```

### 调试日志

所有操作都会输出详细的控制台日志：
- 初始化状态
- 批次处理进度
- 插入成功/失败统计
- 错误详情

## 未来计划

- [ ] 支持增量更新（只插入新增/修改的 chunks）
- [ ] 支持删除操作
- [ ] 支持更新操作
- [ ] 添加缓存机制
- [ ] 支持多集合管理
- [ ] 添加性能监控
- [ ] 支持自定义距离度量

