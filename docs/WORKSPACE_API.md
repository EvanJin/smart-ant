# Workspace API 使用文档

## 概述

`Workspace` 类提供了工作区文件管理、代码索引和 Merkle 树构建的功能。它使用依赖注入模式，支持自动加载 `.gitignore` 规则，并集成了代码分块和向量化功能。

## 功能特性

- ✅ 自动加载 `.gitignore` 文件
- ✅ 递归遍历目录
- ✅ 排除 `.gitignore` 中指定的文件和目录
- ✅ 默认排除 `.git` 目录
- ✅ 代码文件过滤
- ✅ Merkle 树构建和验证
- ✅ 代码块（Chunk）管理
- ✅ Git 仓库信息获取
- ✅ 依赖注入支持

## 依赖注入

`Workspace` 类使用 InversifyJS 进行依赖管理：

```typescript
import { injectable } from "inversify";

@injectable()
export class Workspace {
  constructor() {
    // 无参数构造函数，由 DI 容器管理
  }
  
  initialize(path: string, codeOnly: boolean = false) {
    // 实际初始化逻辑
  }
}
```

### 获取实例

```typescript
import container from "@/core";
import { Workspace } from "@/core/workspace";

// 从容器获取单例
const workspace = container.get(Workspace);

// 初始化工作区
workspace.initialize("/path/to/project", true);
```

## API 方法

### initialize(path, codeOnly)

```typescript
workspace.initialize(workspacePath: string, codeOnly?: boolean): void
```

初始化工作区，加载 `.gitignore` 文件。

**参数：**
- `workspacePath`: 工作区路径
- `codeOnly` (可选): 是否只遍历代码文件，默认为 `false`

**示例：**
```typescript
const workspace = container.get(Workspace);
workspace.initialize("/Users/username/project", true);
```

### getWorkspaceName()

```typescript
const name = workspace.getWorkspaceName(): string | undefined
```

返回工作区名称（路径的最后一部分）。

**返回：** 工作区名称，如 `"smart-ant"`

### getPath()

```typescript
const path = workspace.getPath(): string
```

获取当前工作区的完整路径。

**返回：** 工作区路径，如 `"/Users/username/smart-ant"`

### getRepoHash()

```typescript
const repoHash = await workspace.getRepoHash(): Promise<string>
```

获取 Git 仓库的哈希标识（用于 Qdrant 集合命名）。

**返回：** 仓库名称或路径的最后一段，如 `"smart-ant.git"` 或 `"smart-ant"`

**示例：**
```typescript
const repoHash = await workspace.getRepoHash();
console.log(`仓库标识: ${repoHash}`);
// 输出: 仓库标识: smart-ant.git
```

### buildCodeIndex(config?)

```typescript
const stats = workspace.buildCodeIndex(config?: ChunkConfig): MerkleTreeStats
```

构建代码索引，创建 Merkle 树和代码块。

**参数：**
- `config` (可选): 分块配置
  - `maxChunkSize`: 最大块大小（字节），默认 4096
  - `minChunkSize`: 最小块大小（字节），默认 512
  - `overlapLines`: 重叠行数，默认 2

**返回：** `MerkleTreeStats` 对象
- `totalFiles`: 索引的文件总数
- `totalChunks`: 生成的代码块总数
- `totalSize`: 代码块总大小（字节）
- `rootHash`: Merkle 树根哈希
- `buildTime`: 构建耗时（毫秒）

**示例：**
```typescript
const stats = workspace.buildCodeIndex({
  maxChunkSize: 4096,
  minChunkSize: 512,
  overlapLines: 2,
});

console.log(`索引了 ${stats.totalFiles} 个文件`);
console.log(`生成了 ${stats.totalChunks} 个代码块`);
console.log(`根哈希: ${stats.rootHash}`);
```

### verifyCodeIndex()

```typescript
const isValid = workspace.verifyCodeIndex(): boolean
```

验证 Merkle 树的完整性。

**返回：** `true` 表示验证通过，`false` 表示验证失败

### getAllCodeChunks()

```typescript
const chunks = workspace.getAllCodeChunks(): CodeChunk[]
```

获取所有代码块。

**返回：** `CodeChunk[]` 数组

### getCodeChunksByFile(filePath)

```typescript
const chunks = workspace.getCodeChunksByFile(filePath: string): CodeChunk[]
```

根据文件路径获取该文件的所有代码块。

**参数：**
- `filePath`: 文件的相对路径

**返回：** `CodeChunk[]` 数组

### searchCodeChunks(query)

```typescript
const chunks = workspace.searchCodeChunks(query: string): CodeChunk[]
```

在代码块中搜索包含指定文本的块。

**参数：**
- `query`: 搜索关键词

**返回：** 匹配的 `CodeChunk[]` 数组

### getCodeIndexStats()

```typescript
const stats = workspace.getCodeIndexStats(): MerkleTreeStats | null
```

获取 Merkle 树的统计信息。

**返回：** `MerkleTreeStats` 对象或 `null`（如果未构建索引）

### printMerkleTree()

```typescript
workspace.printMerkleTree(): void
```

在控制台打印 Merkle 树的结构。

## 数据类型

### FileInfo 接口

```typescript
interface FileInfo {
  filePath: string;      // 文件的完整路径
  relativePath: string;  // 相对于工作区根目录的路径
  isDirectory: boolean;  // 是否为目录
}
```

### CodeChunk 接口

```typescript
interface CodeChunk {
  id: string;            // chunk 的唯一标识符
  filePath: string;      // 文件的绝对路径
  relativePath: string;  // 文件的相对路径
  content: string;       // chunk 的文本内容
  startLine: number;     // chunk 在文件中的起始行号
  endLine: number;       // chunk 在文件中的结束行号
  hash: string;          // chunk 内容的 SHA256 哈希值
  size: number;          // chunk 的大小（字节）
  embedding: number[];   // chunk 的文本嵌入向量
}
```

### ChunkConfig 接口

```typescript
interface ChunkConfig {
  maxChunkSize?: number;  // 最大块大小（字节），默认 4096
  minChunkSize?: number;  // 最小块大小（字节），默认 512
  overlapLines?: number;  // 重叠行数，默认 2
}
```

### MerkleTreeStats 接口

```typescript
interface MerkleTreeStats {
  totalFiles: number;   // 索引的总文件数
  totalChunks: number;  // 生成的总代码块数
  totalSize: number;    // 所有代码块的总大小（字节）
  rootHash: string;     // Merkle 树的根哈希值
  buildTime: number;    // 构建 Merkle 树所花费的时间（毫秒）
}
```

## 使用示例

### 示例 1: 基本使用

```typescript
import container from "@/core";
import { Workspace } from "@/core/workspace";

// 获取 Workspace 实例
const workspace = container.get(Workspace);

// 初始化工作区（只遍历代码文件）
workspace.initialize("/path/to/project", true);

// 构建代码索引
const stats = workspace.buildCodeIndex({
  maxChunkSize: 4096,
  minChunkSize: 512,
  overlapLines: 2,
});

console.log(`索引完成: ${stats.totalFiles} 个文件, ${stats.totalChunks} 个代码块`);
```

### 示例 2: 验证索引完整性

```typescript
// 构建索引
workspace.buildCodeIndex();

// 验证 Merkle 树
const isValid = workspace.verifyCodeIndex();
console.log(`索引验证: ${isValid ? '✓ 通过' : '✗ 失败'}`);

// 获取统计信息
const stats = workspace.getCodeIndexStats();
if (stats) {
  console.log(`根哈希: ${stats.rootHash}`);
  console.log(`构建时间: ${stats.buildTime}ms`);
}
```

### 示例 3: 搜索代码块

```typescript
// 搜索包含特定关键词的代码块
const chunks = workspace.searchCodeChunks("function");

console.log(`找到 ${chunks.length} 个匹配的代码块`);
chunks.forEach(chunk => {
  console.log(`${chunk.relativePath}:${chunk.startLine}-${chunk.endLine}`);
});
```

### 示例 4: 按文件获取代码块

```typescript
// 获取特定文件的所有代码块
const fileChunks = workspace.getCodeChunksByFile("src/extension.ts");

console.log(`文件包含 ${fileChunks.length} 个代码块`);
fileChunks.forEach(chunk => {
  console.log(`行 ${chunk.startLine}-${chunk.endLine}: ${chunk.size} 字节`);
});
```

### 示例 5: 获取仓库信息

```typescript
// 获取 Git 仓库标识
const repoHash = await workspace.getRepoHash();
console.log(`仓库标识: ${repoHash}`);

// 获取工作区路径
const path = workspace.getPath();
console.log(`工作区路径: ${path}`);
```

## VSCode 命令

插件提供了以下命令：

### Smart Ant: 代码索引

- **命令 ID**: `smart-ant.codeIndexing`
- **功能**: 构建当前工作区的代码索引，生成 Merkle 树和代码块，并上传到 Qdrant
- **使用**: 按 `Cmd+Shift+P` (Mac) 或 `Ctrl+Shift+P` (Windows/Linux)，输入 "Smart Ant: 代码索引"

### Smart Ant: 搜索代码

- **命令 ID**: `smart-ant.searchCode`
- **功能**: 在代码块中进行语义搜索
- **使用**: 按 `Cmd+Shift+P` (Mac) 或 `Ctrl+Shift+P` (Windows/Linux)，输入 "Smart Ant: 搜索代码"

## 注意事项

1. **依赖注入**: 必须通过 DI 容器获取 `Workspace` 实例
2. **两阶段初始化**: 先从容器获取实例，再调用 `initialize()` 方法
3. **代码文件过滤**: 支持 50+ 种编程语言的文件扩展名
4. **Gitignore 支持**: 自动读取并遵守 `.gitignore` 规则
5. **Merkle 树**: 使用 SHA256 哈希确保代码完整性
6. **性能**: 大型项目可能需要较长时间构建索引

## 错误处理

- 如果工作区未初始化，相关方法会返回空结果
- 如果 Merkle 树未构建，验证方法会返回 `false`
- 如果 `.gitignore` 文件读取失败，会使用默认规则
- 如果无法访问某个目录，会输出错误并继续处理其他目录

## 相关文档

- [依赖注入架构](./DEPENDENCY_INJECTION.md)
- [Merkle 树实现](./MERKLE_TREE.md)
- [Qdrant 集成](./QDRANT_INTEGRATION.md)
- [配置指南](./CONFIGURATION.md)

