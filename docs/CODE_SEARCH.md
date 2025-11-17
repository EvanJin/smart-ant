# 代码搜索功能

## 概述

Smart Ant 提供了强大的语义代码搜索功能，可以通过自然语言描述来查找相关代码，而不仅仅是简单的关键词匹配。

## 功能特性

### ✅ 语义搜索
- 使用自然语言描述查找代码
- 基于代码含义而非精确匹配
- 返回相似度评分

### ✅ 多种搜索方式
- **文本搜索** (`searchByText`): 通过自然语言查询
- **向量搜索** (`searchSimilar`): 直接使用嵌入向量
- **文件搜索** (`searchByFile`): 按文件路径查找
- **混合搜索** (`hybridSearch`): 结合语义和过滤条件

### ✅ 智能结果展示
- 相似度评分（百分比）
- 代码位置（文件路径、行号）
- 代码预览
- Markdown 格式结果文档

## VSCode 命令

### Smart Ant: 搜索代码

**命令 ID**: `smart-ant.searchCode`

**使用步骤**:

1. 按 `Cmd+Shift+P` (Mac) 或 `Ctrl+Shift+P` (Windows/Linux)
2. 输入 "Smart Ant: 搜索代码"
3. 在弹出的输入框中输入搜索内容
4. 等待搜索完成
5. 查看结果文档

**搜索示例**:
- "文件上传功能"
- "数据库连接代码"
- "API 请求处理"
- "用户认证逻辑"
- "错误处理函数"

## API 使用

### 1. 文本搜索 (searchByText)

最常用的搜索方式，通过自然语言查询代码。

```typescript
import { QdrantClient } from "@/core/qdrant";
import { OpenAIClient } from "@/core/openai";

// 搜索代码
const results = await QdrantClient.searchByText(
  "文件上传功能",
  10,  // 返回前 10 个结果
  async (text) => {
    return await OpenAIClient.initialize().createEmbedding(text);
  }
);

// 处理结果
results.forEach((result, idx) => {
  console.log(`[${idx + 1}] 相似度: ${(result.score * 100).toFixed(2)}%`);
  console.log(`文件: ${result.chunk.relativePath}`);
  console.log(`位置: 行 ${result.chunk.startLine}-${result.chunk.endLine}`);
  console.log(`内容: ${result.chunk.content.substring(0, 100)}...`);
  console.log("");
});
```

**返回结果**:
```typescript
[
  {
    chunk: {
      id: "src/upload.ts:1-50",
      filePath: "/path/to/project/src/upload.ts",
      relativePath: "src/upload.ts",
      content: "...",
      startLine: 1,
      endLine: 50,
      hash: "abc123...",
      size: 2048,
      embedding: [...]
    },
    score: 0.89  // 相似度分数 (0-1)
  },
  // ... 更多结果
]
```

### 2. 向量搜索 (searchSimilar)

直接使用嵌入向量搜索，适合已有向量的场景。

```typescript
import { QdrantClient } from "@/core/qdrant";
import { OpenAIClient } from "@/core/openai";

// 1. 生成查询向量
const query = "如何实现文件上传";
const queryEmbedding = await OpenAIClient.initialize().createEmbedding(query);

// 2. 搜索相似代码块
const results = await QdrantClient.searchSimilar(queryEmbedding, 10);

// 3. 处理结果
console.log(`找到 ${results.length} 个相关代码块`);
results.forEach((chunk) => {
  console.log(`- ${chunk.relativePath} (行 ${chunk.startLine}-${chunk.endLine})`);
});
```

### 3. 文件搜索 (searchByFile)

查找特定文件的所有代码块。

```typescript
import { QdrantClient } from "@/core/qdrant";

// 搜索指定文件的所有代码块
const chunks = await QdrantClient.searchByFile("src/extension.ts");

console.log(`文件 src/extension.ts 包含 ${chunks.length} 个代码块:`);
chunks.forEach((chunk, idx) => {
  console.log(`[${idx + 1}] 行 ${chunk.startLine}-${chunk.endLine} (${chunk.size}B)`);
});
```

### 4. 混合搜索 (hybridSearch)

结合语义搜索和过滤条件，实现更精确的查询。

```typescript
import { QdrantClient } from "@/core/qdrant";
import { OpenAIClient } from "@/core/openai";

// 混合搜索：在特定文件中查找相关代码
const results = await QdrantClient.hybridSearch(
  "错误处理",
  {
    filePath: "src/utils/error.ts",  // 只在这个文件中搜索
    minLine: 10,                      // 起始行 >= 10
    maxLine: 100,                     // 结束行 <= 100
  },
  5,  // 返回前 5 个结果
  async (text) => {
    return await OpenAIClient.initialize().createEmbedding(text);
  }
);

console.log(`在 src/utils/error.ts 中找到 ${results.length} 个相关代码块`);
```

## 搜索技巧

### 1. 使用描述性查询

✅ **好的查询**:
- "实现用户登录验证的函数"
- "处理文件上传的中间件"
- "连接 MySQL 数据库的代码"
- "发送 HTTP POST 请求"

❌ **不好的查询**:
- "login" (太简单，使用关键词搜索即可)
- "代码" (太宽泛)
- "function" (太通用)

### 2. 指定功能特征

```typescript
// 查询特定功能
await QdrantClient.searchByText("异步处理文件上传并返回 URL", 10, embedFn);

// 查询特定模式
await QdrantClient.searchByText("使用 try-catch 处理错误", 10, embedFn);

// 查询特定技术栈
await QdrantClient.searchByText("使用 Express 中间件验证 JWT token", 10, embedFn);
```

### 3. 结合过滤条件

```typescript
// 只在特定文件中搜索
const results = await QdrantClient.hybridSearch(
  "数据验证",
  { filePath: "src/validators/" },
  10,
  embedFn
);

// 只搜索特定行范围
const results = await QdrantClient.hybridSearch(
  "初始化配置",
  { minLine: 1, maxLine: 50 },  // 只搜索文件开头部分
  10,
  embedFn
);
```

## 搜索结果

### 结果格式

```typescript
interface SearchResult {
  chunk: CodeChunk;  // 代码块信息
  score: number;     // 相似度分数 (0-1)
}
```

### 相似度分数

- **0.9 - 1.0**: 非常相关，几乎完全匹配
- **0.7 - 0.9**: 高度相关，很可能是你要找的
- **0.5 - 0.7**: 中度相关，可能包含部分相关内容
- **0.3 - 0.5**: 低度相关，可能只有少量关联
- **< 0.3**: 基本不相关

### 结果排序

搜索结果按相似度从高到低排序，最相关的代码块排在最前面。

## 使用场景

### 1. 学习代码库

```typescript
// 了解如何实现某个功能
const results = await QdrantClient.searchByText(
  "如何处理用户认证",
  10,
  embedFn
);
```

### 2. 查找示例代码

```typescript
// 查找类似的实现
const results = await QdrantClient.searchByText(
  "API 错误处理示例",
  5,
  embedFn
);
```

### 3. 代码审查

```typescript
// 查找可能存在问题的代码
const results = await QdrantClient.searchByText(
  "没有错误处理的数据库操作",
  10,
  embedFn
);
```

### 4. 重构准备

```typescript
// 查找需要重构的相似代码
const results = await QdrantClient.searchByText(
  "重复的数据验证逻辑",
  20,
  embedFn
);
```

### 5. 功能定位

```typescript
// 快速定位功能实现位置
const results = await QdrantClient.searchByText(
  "发送邮件通知的函数",
  5,
  embedFn
);
```

## 性能优化

### 1. 限制返回结果数量

```typescript
// 只返回最相关的 5 个结果
const results = await QdrantClient.searchByText(query, 5, embedFn);
```

### 2. 使用缓存

```typescript
// 缓存常用查询的嵌入向量
const embeddingCache = new Map<string, number[]>();

async function cachedEmbedding(text: string): Promise<number[]> {
  if (embeddingCache.has(text)) {
    return embeddingCache.get(text)!;
  }
  
  const embedding = await OpenAIClient.initialize().createEmbedding(text);
  embeddingCache.set(text, embedding);
  return embedding;
}

// 使用缓存
const results = await QdrantClient.searchByText(query, 10, cachedEmbedding);
```

### 3. 批量查询

```typescript
// 一次性查询多个相关主题
const queries = [
  "用户认证",
  "权限验证",
  "会话管理"
];

const allResults = await Promise.all(
  queries.map(q => QdrantClient.searchByText(q, 5, embedFn))
);
```

## 故障排除

### 问题 1: 搜索结果不相关

**原因**: 
- 查询太简单或太宽泛
- 代码索引不完整

**解决**:
```typescript
// 使用更具体的描述
// ❌ "upload"
// ✅ "处理多文件上传并保存到服务器"

// 重新构建索引
await workspace.buildCodeIndex();
```

### 问题 2: 搜索速度慢

**原因**:
- 生成嵌入向量需要时间
- 网络延迟

**解决**:
```typescript
// 1. 减少返回结果数量
const results = await QdrantClient.searchByText(query, 5, embedFn);

// 2. 使用缓存
// 3. 使用混合搜索缩小范围
```

### 问题 3: 找不到结果

**原因**:
- 代码库中确实没有相关代码
- 索引未构建或不完整

**解决**:
```typescript
// 1. 检查索引状态
const info = await QdrantClient.getCollectionInfo();
console.log(`索引中有 ${info.vectors_count} 个代码块`);

// 2. 重新构建索引
await workspace.buildCodeIndex();

// 3. 尝试不同的查询方式
```

## 最佳实践

### 1. 定期更新索引

```typescript
// 代码变更后重新构建索引
await workspace.buildCodeIndex();
```

### 2. 使用具体的查询

```typescript
// ✅ 好的查询
"使用 JWT 验证用户身份的中间件函数"

// ❌ 不好的查询
"验证"
```

### 3. 结合多种搜索方式

```typescript
// 先用文本搜索找到相关文件
const textResults = await QdrantClient.searchByText("用户管理", 5, embedFn);

// 然后在相关文件中详细搜索
const fileResults = await QdrantClient.searchByFile(
  textResults[0].chunk.relativePath
);
```

### 4. 验证搜索结果

```typescript
// 检查相似度分数
results.forEach((result) => {
  if (result.score > 0.7) {
    console.log("高度相关:", result.chunk.relativePath);
  }
});
```

## 未来计划

- [ ] 支持多语言查询（中英文混合）
- [ ] 添加搜索历史记录
- [ ] 支持搜索结果排序（按文件、按时间等）
- [ ] 添加搜索过滤器（按语言、按大小等）
- [ ] 实现搜索结果高亮显示
- [ ] 支持正则表达式搜索
- [ ] 添加搜索建议和自动补全

