# 批量 Embedding 生成优化

## 概述

将代码索引流程中的逐个 embedding 生成改为批量处理，显著提高执行效率。

## 优化前后对比

### 优化前（逐个处理）

```typescript
for (let i = 0; i < allChunks.length; i++) {
  const chunk = allChunks[i];
  try {
    const embedding = await OpenAIClient.createEmbedding(chunk.content);
    if (embedding) {
      chunk.embedding = embedding;
      console.log(`[${i + 1}/${allChunks.length}] ${chunk.id} 嵌入生成成功`);
    }
  } catch (error) {
    console.error(`[${i + 1}/${allChunks.length}] ${chunk.id} 嵌入生成失败:`, error);
  }
}
```

**问题**:
- 每个 chunk 都需要单独发起一次 API 请求
- 网络延迟累积，总耗时 = 单次请求时间 × chunk 数量
- API 调用频率高，可能触发速率限制

### 优化后（批量处理）

```typescript
// 提取所有 chunk 的内容
const contents = allChunks.map((chunk) => chunk.content);

// 批量生成 embeddings（每批 100 个）
const embeddings = await OpenAIClient.createEmbeddings(contents, 100);

// 将 embeddings 分配给对应的 chunks
for (let i = 0; i < allChunks.length; i++) {
  if (embeddings[i] && embeddings[i].length > 0) {
    allChunks[i].embedding = embeddings[i];
    successCount++;
  }
}
```

**优势**:
- 批量发送请求，减少网络往返次数
- 总耗时 = 单次批量请求时间 × (chunk 数量 / 批次大小)
- 降低 API 调用频率，避免速率限制

## 性能提升

### 理论性能提升

假设：
- 单次 API 请求耗时：200ms（包括网络延迟）
- 批次大小：100 个 chunk
- 总 chunk 数：1000 个

**优化前**:
- 总请求次数：1000 次
- 总耗时：1000 × 200ms = 200 秒（约 3.3 分钟）

**优化后**:
- 总请求次数：1000 / 100 = 10 次
- 总耗时：10 × 200ms = 2 秒

**性能提升**: **约 100 倍**（理论值）

### 实际性能提升

实际性能提升取决于：
- 网络延迟
- API 服务器处理能力
- 批次大小
- Chunk 内容长度

预期实际提升：**10-50 倍**

## 批量处理实现

### OpenAI 客户端新增方法

```typescript
/**
 * 批量创建文本嵌入
 * @param texts - 文本数组
 * @param batchSize - 每批处理的数量（默认 100，OpenAI API 限制最大 2048）
 * @returns 文本嵌入向量数组
 */
public async createEmbeddings(
  texts: string[],
  batchSize: number = 100
): Promise<number[][]> {
  this.ensureInitialized();

  const results: number[][] = [];
  const totalBatches = Math.ceil(texts.length / batchSize);

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const batchIndex = Math.floor(i / batchSize) + 1;

    try {
      const response = await this.client!.embeddings.create({
        model: this.config.model!,
        input: batch,
      });

      // 按顺序提取 embedding
      const embeddings = response.data
        .sort((a, b) => a.index - b.index)
        .map((item) => item.embedding);

      results.push(...embeddings);
    } catch (error) {
      // 如果批量失败，尝试逐个处理该批次
      for (const text of batch) {
        try {
          const embedding = await this.createEmbedding(text);
          results.push(embedding);
        } catch (err) {
          results.push([]);
        }
      }
    }
  }

  return results;
}
```

### 关键特性

1. **分批处理**: 将大量文本分成多个批次处理，避免单次请求过大
2. **顺序保证**: 使用 `index` 字段确保返回的 embeddings 顺序与输入一致
3. **错误处理**: 批量失败时自动降级为逐个处理，保证可靠性
4. **进度日志**: 详细的日志输出，便于监控处理进度

## 批次大小选择

### OpenAI API 限制

- **最大批次大小**: 2048 个文本
- **最大 token 数**: 取决于模型（text-embedding-3-small 约 8191 tokens）

### 推荐配置

| Chunk 平均大小 | 推荐批次大小 | 说明 |
|--------------|------------|------|
| < 100 tokens | 200-500 | 小文本，可以大批次 |
| 100-500 tokens | 100-200 | 中等文本，平衡批次 |
| 500-1000 tokens | 50-100 | 大文本，小批次 |
| > 1000 tokens | 20-50 | 超大文本，最小批次 |

**默认配置**: 100 个/批（适合大多数场景）

## 使用示例

### 基本用法

```typescript
import { OpenAIClient } from "@/core/openai";

// 准备文本数组
const texts = [
  "第一段代码内容...",
  "第二段代码内容...",
  "第三段代码内容...",
  // ... 更多文本
];

// 批量生成 embeddings
const embeddings = await OpenAIClient.createEmbeddings(texts, 100);

// 使用结果
embeddings.forEach((embedding, index) => {
  console.log(`文本 ${index}: embedding 维度 ${embedding.length}`);
});
```

### 在代码索引中使用

```typescript
// 获取所有 chunks
const allChunks = workspace.getAllCodeChunks();

// 提取内容
const contents = allChunks.map((chunk) => chunk.content);

// 批量生成 embeddings
const embeddings = await OpenAIClient.createEmbeddings(contents, 100);

// 分配给 chunks
for (let i = 0; i < allChunks.length; i++) {
  if (embeddings[i] && embeddings[i].length > 0) {
    allChunks[i].embedding = embeddings[i];
  }
}
```

## 错误处理

### 批量失败降级

如果整批请求失败，系统会自动降级为逐个处理：

```typescript
catch (error) {
  console.error(`第 ${batchIndex} 批处理失败:`, error);
  console.log(`尝试逐个处理第 ${batchIndex} 批...`);
  
  for (const text of batch) {
    try {
      const embedding = await this.createEmbedding(text);
      results.push(embedding);
    } catch (err) {
      console.error("单个文本处理失败:", err);
      results.push([]); // 空数组占位
    }
  }
}
```

### 空 Embedding 检测

```typescript
for (let i = 0; i < allChunks.length; i++) {
  if (embeddings[i] && embeddings[i].length > 0) {
    allChunks[i].embedding = embeddings[i];
    successCount++;
  } else {
    console.error(`Chunk ${allChunks[i].id} 的 embedding 为空`);
    failCount++;
  }
}
```

## 监控和日志

### 批量处理日志

```
开始批量生成 embedding，共 1000 个文本，分 10 批处理
处理第 1/10 批，包含 100 个文本
第 1/10 批处理完成，已生成 100/1000 个 embedding
处理第 2/10 批，包含 100 个文本
第 2/10 批处理完成，已生成 200/1000 个 embedding
...
批量 embedding 生成完成，共 1000 个
```

### 结果统计

```
批量 embedding 生成完成: 成功 998 个，失败 2 个
```

## 注意事项

1. **内存占用**: 批量处理会一次性加载多个文本到内存，注意内存使用
2. **API 限制**: 遵守 OpenAI API 的速率限制和配额限制
3. **超时处理**: 大批次可能导致请求超时，适当调整批次大小
4. **顺序一致性**: 确保返回的 embeddings 顺序与输入文本一致

## 相关文件

- `src/core/openai/core.ts` - OpenAI 客户端实现
- `src/commands/code-indexing.ts` - 代码索引命令
- `docs/OPENAI_INTEGRATION.md` - OpenAI 集成文档

## 更新日志

- **v0.0.2**: 新增批量 embedding 生成功能，性能提升 10-50 倍
- **v0.0.1**: 初始实现，逐个生成 embedding

