# 增量更新功能

## 概述

Smart Ant 的增量更新功能可以显著提升大型项目的索引更新速度。通过检测文件变更，系统只重新处理修改、新增或删除的文件，而不是每次都重新索引整个代码库。

## 核心特性

### ✅ 智能变更检测

- 自动检测文件的新增、修改和删除
- 基于文件内容的 SHA256 哈希比对
- 支持 `.gitignore` 规则

### ✅ 增量索引更新

- 只重新处理变更的文件
- 自动更新 Merkle 树结构
- 重新计算根哈希

### ✅ 向量数据库同步

- 删除已删除文件的向量
- 更新修改文件的向量
- 插入新文件的向量

### ✅ 状态持久化

- 索引状态保存在 `.smart-ant/index-state.json`
- 记录所有文件的哈希值
- 记录最后更新时间和统计信息

### ✅ 智能降级

- 变更超过 50% 时自动全量重建
- 状态文件损坏时自动全量重建
- 首次运行时自动全量构建

## 架构设计

### 核心组件

```
IncrementalUpdateManager
    ├─ 状态管理
    │   ├─ 加载索引状态
    │   ├─ 保存索引状态
    │   └─ 清除索引状态
    ├─ 变更检测
    │   ├─ 计算文件哈希
    │   ├─ 比对新旧哈希
    │   └─ 生成变更列表
    └─ 状态持久化
        └─ .smart-ant/index-state.json

Workspace
    ├─ buildCodeIndexIncremental()
    │   ├─ 检测文件变更
    │   ├─ 判断增量/全量
    │   └─ 执行相应策略
    ├─ performIncrementalUpdate()
    │   ├─ 更新变更文件
    │   ├─ 删除删除文件
    │   └─ 重新计算根哈希
    └─ performFullBuild()
        └─ 全量重建索引

Merkle
    ├─ updateFile()
    │   └─ 重新分块并更新
    ├─ removeFile()
    │   └─ 删除文件的所有 chunks
    └─ recalculateRootHash()
        └─ 重新计算根哈希

QdrantCoreClient
    ├─ deleteChunksByFile()
    │   └─ 删除指定文件的向量
    └─ incrementalUpdate()
        ├─ 处理删除的文件
        ├─ 处理修改的文件
        └─ 处理新增的文件
```

### 数据流

```
用户触发索引
    ↓
选择模式（增量/全量）
    ↓
加载索引状态
    ↓
检测文件变更
    ↓
判断策略
    ├─ 增量更新（变更 < 50%）
    │   ├─ 更新 Merkle 树
    │   ├─ 生成变更文件的向量
    │   └─ 增量更新 Qdrant
    └─ 全量重建（变更 >= 50% 或首次）
        ├─ 重建 Merkle 树
        ├─ 生成所有文件的向量
        └─ 全量更新 Qdrant
    ↓
保存索引状态
    ↓
完成
```

## 使用方式

### 1. 通过 VSCode 命令

1. 打开命令面板（`Cmd+Shift+P` / `Ctrl+Shift+P`）
2. 输入 "Smart Ant: 代码索引"
3. 选择索引模式：
   - **增量更新**：只处理变更的文件（推荐）
   - **全量重建**：重新索引所有文件

### 2. 通过代码调用

```typescript
import container from "@/core";
import { Workspace } from "@/core/workspace";

// 获取 Workspace 实例
const workspace = container.get(Workspace);

// 初始化工作区
workspace.initialize("/path/to/project", true);

// 增量更新（自动检测变更）
const { stats, changes, isIncremental } =
  workspace.buildCodeIndexIncremental();

console.log(`模式: ${isIncremental ? "增量" : "全量"}`);
console.log(`变更: ${changes.length} 个文件`);
console.log(`耗时: ${stats.buildTime}ms`);

// 强制全量重建
const result = workspace.buildCodeIndexIncremental({}, true);
```

### 3. 清除索引状态

```typescript
// 清除状态，下次将执行全量重建
workspace.clearIndexState();
```

## 索引状态文件

### 位置

```
.smart-ant/
└── index-state.json
```

### 格式

```json
{
  "rootHash": "a1b2c3d4...",
  "fileHashes": {
    "src/extension.ts": "e5f6g7h8...",
    "src/core/workspace/core.ts": "i9j0k1l2...",
    ...
  },
  "lastUpdated": 1700000000000,
  "totalFiles": 150,
  "totalChunks": 750
}
```

### 字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `rootHash` | string | Merkle 树的根哈希 |
| `fileHashes` | object | 文件路径到哈希的映射 |
| `lastUpdated` | number | 最后更新时间戳（毫秒） |
| `totalFiles` | number | 索引的总文件数 |
| `totalChunks` | number | 生成的总代码块数 |

## 性能对比

### 场景 1: 修改 1 个文件（1000 个文件的项目）

| 模式 | 处理文件数 | 生成向量数 | 耗时 | 提升 |
|------|-----------|-----------|------|------|
| 全量 | 1000 | ~5000 | ~60s | - |
| 增量 | 1 | ~5 | ~2s | **97%** |

### 场景 2: 修改 10 个文件

| 模式 | 处理文件数 | 生成向量数 | 耗时 | 提升 |
|------|-----------|-----------|------|------|
| 全量 | 1000 | ~5000 | ~60s | - |
| 增量 | 10 | ~50 | ~5s | **92%** |

### 场景 3: 修改 100 个文件

| 模式 | 处理文件数 | 生成向量数 | 耗时 | 提升 |
|------|-----------|-----------|------|------|
| 全量 | 1000 | ~5000 | ~60s | - |
| 增量 | 100 | ~500 | ~15s | **75%** |

### 场景 4: 修改 600 个文件（超过 50%）

| 模式 | 处理文件数 | 生成向量数 | 耗时 | 说明 |
|------|-----------|-----------|------|------|
| 增量 | 600 | ~3000 | ~40s | 自动降级为全量 |
| 全量 | 1000 | ~5000 | ~60s | - |

## 变更检测逻辑

### 1. 文件哈希计算

```typescript
// 计算文件内容的 SHA256 哈希
const content = fs.readFileSync(filePath, "utf-8");
const hash = crypto.createHash("sha256").update(content).digest("hex");
```

### 2. 变更类型判断

```typescript
if (!oldHash) {
  // 新增文件
  changeType = FileChangeType.ADDED;
} else if (oldHash !== newHash) {
  // 修改文件
  changeType = FileChangeType.MODIFIED;
} else {
  // 未变更（跳过）
}

// 删除文件
if (oldHash && !currentFile) {
  changeType = FileChangeType.DELETED;
}
```

### 3. 策略选择

```typescript
const changeRatio = changes.length / totalFiles;

if (changeRatio > 0.5) {
  // 变更超过 50%，执行全量重建
  performFullBuild();
} else {
  // 执行增量更新
  performIncrementalUpdate();
}
```

## 增量更新流程

### 1. 文件新增

```
检测到新文件
    ↓
分块生成 chunks
    ↓
生成文本向量
    ↓
插入到 Qdrant
    ↓
更新 Merkle 树
    ↓
保存文件哈希
```

### 2. 文件修改

```
检测到文件变更
    ↓
删除旧的 chunks
    ↓
重新分块
    ↓
生成新的文本向量
    ↓
插入到 Qdrant
    ↓
更新 Merkle 树
    ↓
更新文件哈希
```

### 3. 文件删除

```
检测到文件删除
    ↓
从 Qdrant 删除向量
    ↓
从 Merkle 树删除节点
    ↓
从状态中删除哈希
```

## 错误处理

### 1. 状态文件损坏

```typescript
try {
  loadState();
} catch (error) {
  console.error("加载索引状态失败:", error);
  // 自动降级为全量重建
  performFullBuild();
}
```

### 2. 文件读取失败

```typescript
try {
  calculateFileHash(filePath);
} catch (error) {
  console.error(`计算文件哈希失败: ${filePath}`, error);
  // 返回空哈希，该文件将被视为新增
  return "";
}
```

### 3. 向量更新失败

```typescript
try {
  await incrementalUpdate(changes);
} catch (error) {
  console.error("增量更新失败:", error);
  // 记录错误，继续处理其他文件
  result.errors.push({ file, error });
}
```

## 最佳实践

### 1. 定期全量重建

虽然增量更新很快，但建议定期执行全量重建以确保数据一致性：

```typescript
// 每周执行一次全量重建
if (daysSinceLastFullBuild > 7) {
  workspace.buildCodeIndexIncremental({}, true);
}
```

### 2. 清理状态文件

如果遇到索引问题，可以清除状态文件重新开始：

```bash
rm -rf .smart-ant/
```

或通过代码：

```typescript
workspace.clearIndexState();
```

### 3. 监控变更比例

如果经常触发全量重建，可能需要调整阈值：

```typescript
// 在 workspace/core.ts 中调整
if (changes.length > codeFiles.length * 0.5) {
  // 将 0.5 调整为其他值，如 0.7
}
```

### 4. 备份状态文件

对于重要项目，可以备份状态文件：

```bash
cp .smart-ant/index-state.json .smart-ant/index-state.backup.json
```

## 注意事项

### ⚠️ 状态文件位置

- 状态文件保存在工作区根目录的 `.smart-ant/` 文件夹
- 该文件夹已添加到 `.gitignore`，不会提交到版本控制

### ⚠️ 并发安全

- 当前实现不支持并发更新
- 同时运行多个索引命令可能导致状态不一致

### ⚠️ 大文件处理

- 大文件的哈希计算可能较慢
- 可以考虑使用文件修改时间作为快速检查

### ⚠️ 磁盘空间

- 状态文件会占用一定磁盘空间
- 对于大型项目（10000+ 文件），状态文件可能达到几 MB

### ⚠️ Git 操作

- 切换分支或拉取代码后，建议重新运行索引
- 系统会自动检测变更并执行增量更新

## 故障排查

### 问题 1: 增量更新后搜索结果不准确

**原因**: 可能是状态文件与实际文件不同步

**解决方案**:
```typescript
// 清除状态并重新全量构建
workspace.clearIndexState();
workspace.buildCodeIndexIncremental({}, true);
```

### 问题 2: 状态文件过大

**原因**: 项目文件过多

**解决方案**:
```typescript
// 只索引代码文件
workspace.initialize(path, true); // codeOnly = true
```

### 问题 3: 增量更新很慢

**原因**: 可能是变更文件过多

**解决方案**:
- 系统会自动降级为全量重建（变更 > 50%）
- 可以手动选择全量重建

### 问题 4: 找不到状态文件

**原因**: 首次运行或状态文件被删除

**解决方案**:
- 系统会自动执行全量构建
- 无需手动处理

## 未来优化

### 1. 文件监听

集成 VSCode 的文件监听 API，实时检测变更：

```typescript
vscode.workspace.onDidChangeTextDocument((event) => {
  // 自动触发增量更新
});
```

### 2. 后台索引

在后台自动执行增量更新，不影响用户操作：

```typescript
// 每 5 分钟自动检查变更
setInterval(() => {
  workspace.buildCodeIndexIncremental();
}, 5 * 60 * 1000);
```

### 3. 智能合并

合并多次小变更，批量处理：

```typescript
// 收集 1 分钟内的所有变更
const changes = collectChanges(60000);
// 批量处理
workspace.batchUpdate(changes);
```

### 4. 缓存优化

缓存文件哈希和嵌入向量：

```typescript
// 使用 LRU 缓存
const hashCache = new LRUCache<string, string>(1000);
const embeddingCache = new LRUCache<string, number[]>(1000);
```

### 5. 并发处理

支持多文件并发处理：

```typescript
// 使用 Promise.all 并发处理
await Promise.all(
  changes.map((change) => processChange(change))
);
```

## 相关文档

- [架构设计](./ARCHITECTURE.md)
- [Workspace API](./WORKSPACE_API.md)
- [Merkle 树](./MERKLE_TREE.md)
- [Qdrant 集成](./QDRANT_INTEGRATION.md)
- [批量嵌入优化](./BATCH_EMBEDDING.md)

## 更新日志

- **v0.1.0**: 初始版本，基本增量更新功能
- **v0.1.1**: 添加智能降级机制
- **v0.1.2**: 优化状态文件格式
- **v0.1.3**: 改进错误处理

