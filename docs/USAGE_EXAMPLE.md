# Smart Ant 使用示例

## 快速开始

### 1. 启动插件

按 `F5` 启动调试，插件会自动加载当前工作区。

### 2. 构建代码索引

按 `Cmd+Shift+P` (Mac) 或 `Ctrl+Shift+P` (Windows/Linux)，输入：

```
Smart Ant: 代码索引
```

### 3. 查看结果

打开"调试控制台"（Debug Console）查看详细输出：

```
=== 开始构建代码索引 ===

找到 25 个代码文件
开始构建 Merkle 树，共 25 个文件...
  处理文件: src/extension.ts (3 chunks)
  处理文件: src/workspace/index.ts (8 chunks)
  处理文件: src/merkel/index.ts (6 chunks)
  ...

Merkle 树构建完成！
  总文件数: 25
  总 chunk 数: 156
  总大小: 245.67 KB
  根哈希: a3f5d8e9c2b1...
  构建时间: 234ms

=== 代码索引构建完成 ===

=== 代码索引统计 ===
总文件数: 25
总 chunk 数: 156
总大小: 245.67 KB
根哈希: a3f5d8e9c2b1...
构建时间: 234ms
索引验证: ✓ 通过

总共生成 156 个代码块

=== 代码块示例 (前3个文件) ===

文件: src/extension.ts
  Chunks: 3 个
    [1] src/extension.ts:1-45 (2048B, 行 1-45)
    [2] src/extension.ts:44-89 (2134B, 行 44-89)
    [3] src/extension.ts:88-119 (1456B, 行 88-119)

文件: src/workspace/index.ts
  Chunks: 8 个
    [1] src/workspace/index.ts:1-52 (2345B, 行 1-52)
    [2] src/workspace/index.ts:51-98 (2156B, 行 51-98)
    ...
```

## 编程使用示例

### 示例 1: 基本索引构建

```typescript
import Workspace from "./workspace";

// 创建工作区实例（只处理代码文件）
const workspace = new Workspace("/path/to/your/project", true);

// 构建代码索引
const stats = workspace.buildCodeIndex({
  maxChunkSize: 4096,  // 4KB
  minChunkSize: 512,   // 512B
  overlapLines: 2,     // 2行重叠
});

console.log(`索引构建完成！`);
console.log(`- 文件数: ${stats.totalFiles}`);
console.log(`- 代码块数: ${stats.totalChunks}`);
console.log(`- 总大小: ${(stats.totalSize / 1024).toFixed(2)} KB`);
console.log(`- 根哈希: ${stats.rootHash.substring(0, 16)}...`);
```

### 示例 2: 搜索代码

```typescript
// 构建索引后搜索
workspace.buildCodeIndex();

// 搜索包含 "import" 的代码块（不区分大小写）
const importChunks = workspace.searchCodeChunks("import", false);

console.log(`找到 ${importChunks.length} 个包含 "import" 的代码块：`);

importChunks.forEach((chunk, idx) => {
  console.log(`\n[${idx + 1}] ${chunk.relativePath}`);
  console.log(`   位置: 行 ${chunk.startLine}-${chunk.endLine}`);
  console.log(`   大小: ${chunk.size} 字节`);
  console.log(`   哈希: ${chunk.hash.substring(0, 16)}...`);
  
  // 显示前3行内容
  const lines = chunk.content.split('\n').slice(0, 3);
  console.log(`   预览:`);
  lines.forEach(line => console.log(`     ${line}`));
});
```

### 示例 3: 按文件查看代码块

```typescript
workspace.buildCodeIndex();

// 获取所有代码文件
const codeFiles = workspace.getCodeFiles();

console.log(`\n代码文件列表 (共 ${codeFiles.length} 个):\n`);

codeFiles.forEach((file, idx) => {
  // 获取该文件的所有代码块
  const chunks = workspace.getCodeChunksByFile(file.relativePath);
  
  if (chunks) {
    console.log(`${idx + 1}. ${file.relativePath}`);
    console.log(`   代码块数: ${chunks.length}`);
    
    const totalSize = chunks.reduce((sum, c) => sum + c.size, 0);
    console.log(`   总大小: ${(totalSize / 1024).toFixed(2)} KB`);
    
    // 显示每个代码块的信息
    chunks.forEach((chunk, chunkIdx) => {
      console.log(`   [${chunkIdx + 1}] 行 ${chunk.startLine}-${chunk.endLine} (${chunk.size}B)`);
    });
    console.log();
  }
});
```

### 示例 4: 验证代码完整性

```typescript
workspace.buildCodeIndex();

// 验证 Merkle 树的完整性
const isValid = workspace.verifyCodeIndex();

if (isValid) {
  console.log("✓ 代码索引完整性验证通过");
  console.log("  所有代码块的哈希值都正确");
  console.log("  Merkle 树结构完整");
} else {
  console.error("✗ 代码索引验证失败");
  console.error("  可能存在以下问题：");
  console.error("  - 代码块内容被修改");
  console.error("  - 哈希值计算错误");
  console.error("  - 树结构损坏");
}
```

### 示例 5: 获取统计信息

```typescript
workspace.buildCodeIndex();

const stats = workspace.getCodeIndexStats();

if (stats) {
  console.log("\n=== 代码索引统计 ===");
  console.log(`总文件数: ${stats.totalFiles}`);
  console.log(`总代码块数: ${stats.totalChunks}`);
  console.log(`平均每文件块数: ${(stats.totalChunks / stats.totalFiles).toFixed(2)}`);
  console.log(`总大小: ${(stats.totalSize / 1024).toFixed(2)} KB`);
  console.log(`平均块大小: ${(stats.totalSize / stats.totalChunks).toFixed(2)} B`);
  console.log(`根哈希: ${stats.rootHash}`);
  console.log(`构建时间: ${stats.buildTime}ms`);
  console.log(`处理速度: ${(stats.totalSize / stats.buildTime / 1024).toFixed(2)} KB/s`);
}
```

### 示例 6: 分析代码块分布

```typescript
workspace.buildCodeIndex();

const allChunks = workspace.getAllCodeChunks();

// 按大小分组
const sizeRanges = {
  'small (< 1KB)': 0,
  'medium (1-2KB)': 0,
  'large (2-4KB)': 0,
  'xlarge (> 4KB)': 0,
};

allChunks.forEach(chunk => {
  const sizeKB = chunk.size / 1024;
  if (sizeKB < 1) {
    sizeRanges['small (< 1KB)']++;
  } else if (sizeKB < 2) {
    sizeRanges['medium (1-2KB)']++;
  } else if (sizeKB < 4) {
    sizeRanges['large (2-4KB)']++;
  } else {
    sizeRanges['xlarge (> 4KB)']++;
  }
});

console.log("\n=== 代码块大小分布 ===");
Object.entries(sizeRanges).forEach(([range, count]) => {
  const percentage = (count / allChunks.length * 100).toFixed(1);
  console.log(`${range}: ${count} 个 (${percentage}%)`);
});

// 按文件类型统计
const byFileType = new Map<string, number>();
allChunks.forEach(chunk => {
  const ext = chunk.relativePath.split('.').pop() || 'unknown';
  byFileType.set(ext, (byFileType.get(ext) || 0) + 1);
});

console.log("\n=== 按文件类型统计 ===");
Array.from(byFileType.entries())
  .sort((a, b) => b[1] - a[1])
  .forEach(([ext, count]) => {
    const percentage = (count / allChunks.length * 100).toFixed(1);
    console.log(`.${ext}: ${count} 个代码块 (${percentage}%)`);
  });
```

### 示例 7: 导出代码块数据

```typescript
workspace.buildCodeIndex();

const allChunks = workspace.getAllCodeChunks();

// 导出为 JSON
const exportData = {
  timestamp: new Date().toISOString(),
  stats: workspace.getCodeIndexStats(),
  chunks: allChunks.map(chunk => ({
    id: chunk.id,
    file: chunk.relativePath,
    lines: `${chunk.startLine}-${chunk.endLine}`,
    size: chunk.size,
    hash: chunk.hash,
    // 可以选择是否包含内容
    // content: chunk.content,
  })),
};

// 保存到文件
import fs from 'fs';
fs.writeFileSync(
  'code-index.json',
  JSON.stringify(exportData, null, 2),
  'utf-8'
);

console.log(`代码索引已导出到 code-index.json`);
console.log(`包含 ${allChunks.length} 个代码块的元数据`);
```

### 示例 8: 自定义分块配置

```typescript
// 针对不同项目类型使用不同配置

// 配置 1: 大型项目（减少代码块数量）
const largeProjectConfig = {
  maxChunkSize: 8192,   // 8KB
  minChunkSize: 2048,   // 2KB
  overlapLines: 3,      // 3行重叠
};

// 配置 2: 小型项目（增加代码块粒度）
const smallProjectConfig = {
  maxChunkSize: 2048,   // 2KB
  minChunkSize: 256,    // 256B
  overlapLines: 1,      // 1行重叠
};

// 配置 3: AI 训练数据（平衡大小和上下文）
const aiTrainingConfig = {
  maxChunkSize: 4096,   // 4KB
  minChunkSize: 1024,   // 1KB
  overlapLines: 5,      // 5行重叠（更多上下文）
};

// 使用配置
const workspace = new Workspace(projectPath, true);
workspace.buildCodeIndex(aiTrainingConfig);
```

## 常见问题

### Q1: 构建索引需要多长时间？

**A:** 取决于项目大小：
- 小型项目（< 100 文件）：< 1秒
- 中型项目（100-1000 文件）：1-10秒
- 大型项目（> 1000 文件）：10-60秒

### Q2: 索引会占用多少内存？

**A:** 大约是代码库大小的 2-3 倍（包含哈希和元数据）。

### Q3: 如何处理大型文件？

**A:** 大型文件会自动分割成多个代码块，每个块不超过 `maxChunkSize`。

### Q4: 代码块之间的重叠有什么用？

**A:** 重叠可以：
- 保持代码上下文的连续性
- 避免在函数或类的边界处割裂
- 提高搜索的准确性

### Q5: 如何更新索引？

**A:** 目前需要重新构建整个索引。未来版本将支持增量更新。

## 性能优化建议

1. **合理设置分块大小**：根据项目特点调整
2. **只索引需要的文件**：使用 `.gitignore` 排除不必要的文件
3. **避免频繁重建**：缓存索引结果
4. **使用代码文件模式**：`codeOnly=true` 可以显著减少处理时间

## 下一步

- 查看 [MERKLE_TREE.md](./MERKLE_TREE.md) 了解技术细节
- 查看 [README.md](./README.md) 了解插件功能
- 尝试修改分块配置，观察效果
- 在你的项目中测试代码索引功能

