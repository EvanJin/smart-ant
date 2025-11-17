# Merkle 树和代码分块功能

## 概述

Smart Ant 插件实现了基于 Merkle 树的代码索引功能，可以将代码库分割成可管理的代码块（chunks），并通过 Merkle 树进行组织和验证。

## 核心概念

### 1. Code Chunk（代码块）

代码块是将大文件分割成的小片段，每个块包含：
- **内容**：代码文本
- **位置**：起始行号和结束行号
- **哈希**：SHA256 哈希值，用于验证内容完整性
- **大小**：字节数

### 2. Merkle 树

Merkle 树是一种哈希树结构，用于高效验证数据完整性：
- **叶子节点**：代表单个代码块
- **文件节点**：组合一个文件的所有代码块
- **根节点**：组合所有文件，生成整个代码库的唯一哈希

### 3. 分块策略

- **最大块大小**：4KB（默认）
- **最小块大小**：512B（默认）
- **重叠行数**：2行（默认），用于保持上下文连续性

## 架构设计

```
┌─────────────────────────────────────────┐
│           Workspace                     │
│  ┌───────────────────────────────────┐  │
│  │         Merkle Tree               │  │
│  │  ┌─────────────────────────────┐  │  │
│  │  │      Root Node              │  │  │
│  │  │   (整个代码库的哈希)         │  │  │
│  │  └──────────┬──────────────────┘  │  │
│  │             │                      │  │
│  │    ┌────────┴────────┐            │  │
│  │    ▼                 ▼            │  │
│  │  File Node       File Node        │  │
│  │  (文件哈希)      (文件哈希)       │  │
│  │    │                 │            │  │
│  │  ┌─┴─┐             ┌─┴─┐          │  │
│  │  ▼   ▼             ▼   ▼          │  │
│  │ Chunk Chunk       Chunk Chunk     │  │
│  │ (代码块)          (代码块)        │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

## 核心类

### 1. CodeChunker

负责将代码文件分割成 chunks。

```typescript
const chunker = new CodeChunker({
  maxChunkSize: 4096,
  minChunkSize: 512,
  overlapLines: 2,
});

const chunks = chunker.chunkFile(filePath, relativePath, content);
```

### 2. MerkleNode

表示 Merkle 树的节点。

```typescript
// 创建 chunk 节点
const chunkNode = new MerkleNode("chunk", [], chunk);

// 创建文件节点
const fileNode = new MerkleNode("file", chunkNodes, undefined, filePath);

// 创建根节点
const rootNode = new MerkleNode("root", fileNodes);
```

### 3. Merkle

管理整个 Merkle 树。

```typescript
const merkle = new Merkle(workspacePath, chunkConfig);
const stats = merkle.build(codeFiles);

// 获取所有 chunks
const allChunks = merkle.getAllChunks();

// 搜索 chunks
const results = merkle.searchChunks("function");

// 验证树的完整性
const isValid = merkle.verify();
```

### 4. Workspace

集成了 Merkle 树功能的工作区管理。

```typescript
const workspace = new Workspace(path, true);

// 构建代码索引
const stats = workspace.buildCodeIndex();

// 获取所有代码块
const chunks = workspace.getAllCodeChunks();

// 搜索代码块
const results = workspace.searchCodeChunks("import");

// 验证索引
const isValid = workspace.verifyCodeIndex();
```

## API 方法

### Workspace API

#### buildCodeIndex(chunkConfig?)

构建代码索引（Merkle 树）。

```typescript
const stats = workspace.buildCodeIndex({
  maxChunkSize: 4096,
  minChunkSize: 512,
  overlapLines: 2,
});
```

**返回值：** `MerkleTreeStats`
- `totalFiles`: 总文件数
- `totalChunks`: 总 chunk 数
- `totalSize`: 总大小（字节）
- `rootHash`: 根哈希
- `buildTime`: 构建时间（毫秒）

#### getAllCodeChunks()

获取所有代码块。

```typescript
const chunks: CodeChunk[] = workspace.getAllCodeChunks();
```

#### getCodeChunksByFile(relativePath)

根据文件路径获取代码块。

```typescript
const chunks = workspace.getCodeChunksByFile("src/index.ts");
```

#### searchCodeChunks(query, caseSensitive?)

搜索包含指定内容的代码块。

```typescript
const results = workspace.searchCodeChunks("function", false);
```

#### verifyCodeIndex()

验证代码索引的完整性。

```typescript
const isValid = workspace.verifyCodeIndex();
```

#### getCodeIndexStats()

获取代码索引统计信息。

```typescript
const stats = workspace.getCodeIndexStats();
```

#### printMerkleTree()

在控制台打印 Merkle 树结构。

```typescript
workspace.printMerkleTree();
```

## VSCode 命令

### Smart Ant: 代码索引

- **命令 ID**: `smart-ant.codeIndexing`
- **功能**: 构建代码库的 Merkle 树索引
- **使用**: 按 `Cmd+Shift+P` (Mac) 或 `Ctrl+Shift+P` (Windows/Linux)，输入 "Smart Ant: 代码索引"

执行后会：
1. 扫描所有代码文件
2. 将每个文件分割成代码块
3. 构建 Merkle 树
4. 验证树的完整性
5. 在控制台显示详细统计信息

## 使用示例

### 示例 1: 基本使用

```typescript
import Workspace from "./workspace";

const workspace = new Workspace("/path/to/project", true);

// 构建索引
const stats = workspace.buildCodeIndex();
console.log(`构建完成: ${stats.totalChunks} 个代码块`);

// 获取所有代码块
const chunks = workspace.getAllCodeChunks();
chunks.forEach(chunk => {
  console.log(`${chunk.id}: ${chunk.size}B`);
});
```

### 示例 2: 搜索代码

```typescript
const workspace = new Workspace("/path/to/project", true);
workspace.buildCodeIndex();

// 搜索包含 "import" 的代码块
const results = workspace.searchCodeChunks("import");
console.log(`找到 ${results.length} 个匹配的代码块`);

results.forEach(chunk => {
  console.log(`\n文件: ${chunk.relativePath}`);
  console.log(`位置: 行 ${chunk.startLine}-${chunk.endLine}`);
  console.log(`内容预览: ${chunk.content.substring(0, 100)}...`);
});
```

### 示例 3: 验证代码完整性

```typescript
const workspace = new Workspace("/path/to/project", true);
workspace.buildCodeIndex();

// 验证索引
if (workspace.verifyCodeIndex()) {
  console.log("✓ 代码索引完整性验证通过");
} else {
  console.log("✗ 代码索引可能已损坏");
}
```

### 示例 4: 按文件查看代码块

```typescript
const workspace = new Workspace("/path/to/project", true);
workspace.buildCodeIndex();

const codeFiles = workspace.getCodeFiles();

codeFiles.forEach(file => {
  const chunks = workspace.getCodeChunksByFile(file.relativePath);
  if (chunks) {
    console.log(`\n${file.relativePath}:`);
    console.log(`  共 ${chunks.length} 个代码块`);
    
    chunks.forEach((chunk, idx) => {
      console.log(`  [${idx + 1}] ${chunk.startLine}-${chunk.endLine} (${chunk.size}B)`);
    });
  }
});
```

## 性能优化

### 1. 分块大小调整

根据项目特点调整分块大小：

```typescript
// 大型项目：使用较大的块
workspace.buildCodeIndex({
  maxChunkSize: 8192,  // 8KB
  minChunkSize: 1024,  // 1KB
});

// 小型项目：使用较小的块
workspace.buildCodeIndex({
  maxChunkSize: 2048,  // 2KB
  minChunkSize: 256,   // 256B
});
```

### 2. 只索引需要的文件

```typescript
// 只索引 TypeScript 文件
const workspace = new Workspace(path, true);
const tsFiles = workspace.getCodeFiles()
  .filter(f => f.relativePath.endsWith('.ts'));

const merkle = workspace.getMerkle();
if (merkle) {
  merkle.build(tsFiles);
}
```

## 应用场景

1. **代码搜索**：快速查找包含特定内容的代码块
2. **增量更新**：通过哈希比对检测代码变化
3. **代码分析**：按代码块进行静态分析
4. **AI 辅助**：将代码块作为 AI 模型的输入
5. **版本控制**：跟踪代码块级别的变更
6. **代码审查**：按代码块进行审查和注释

## 技术细节

### 哈希算法

使用 SHA256 算法计算哈希值：
- **安全性高**：抗碰撞性强
- **速度快**：适合大规模代码库
- **标准化**：广泛支持

### 重叠策略

代码块之间保留 2 行重叠：
- **保持上下文**：避免语义割裂
- **提高搜索准确性**：边界内容不会丢失
- **便于代码理解**：每个块都有足够的上下文

### 树结构

三层结构设计：
- **根节点**：代表整个代码库
- **文件节点**：代表单个文件
- **代码块节点**：代表代码片段

## 注意事项

1. **内存使用**：大型项目可能消耗较多内存
2. **构建时间**：首次构建可能需要几秒到几分钟
3. **文件编码**：目前只支持 UTF-8 编码
4. **二进制文件**：自动排除非代码文件
5. **gitignore**：遵守 .gitignore 规则

## 未来计划

- [ ] 支持增量更新（只重建变化的文件）
- [ ] 持久化存储（缓存到磁盘）
- [ ] 并行构建（多线程处理）
- [ ] 更智能的分块策略（基于语法树）
- [ ] 可视化界面（树形视图）
- [ ] 导出/导入功能

