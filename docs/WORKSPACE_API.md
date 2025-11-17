# Workspace API 使用文档

## 概述

`Workspace` 类提供了遍历工作区文件的功能，自动读取并遵守 `.gitignore` 规则。

## 功能特性

- ✅ 自动加载 `.gitignore` 文件
- ✅ 递归遍历目录
- ✅ 排除 `.gitignore` 中指定的文件和目录
- ✅ 默认排除 `.git` 目录
- ✅ 提供多种文件过滤方法

## API 方法

### 构造函数

```typescript
const workspace = new Workspace(workspacePath: string, codeOnly?: boolean);
```

创建 Workspace 实例时会自动加载 `.gitignore` 文件。

**参数：**
- `workspacePath`: 工作区路径
- `codeOnly` (可选): 是否只遍历代码文件，默认为 `false`

### getWorkspaceName()

```typescript
const name = workspace.getWorkspaceName();
```

返回工作区名称（路径的最后一部分）。

### getAllFiles(dirPath?: string)

```typescript
const files: FileInfo[] = workspace.getAllFiles();
```

获取所有文件和目录（排除 gitignore 中的项）。

**参数：**
- `dirPath` (可选): 指定要遍历的目录，默认为工作区根目录

**返回：** `FileInfo[]` 数组

### getFilesOnly()

```typescript
const files: FileInfo[] = workspace.getFilesOnly();
```

只获取文件，不包括目录。

### getDirectoriesOnly()

```typescript
const dirs: FileInfo[] = workspace.getDirectoriesOnly();
```

只获取目录，不包括文件。

### getCodeFiles()

```typescript
const codeFiles: FileInfo[] = workspace.getCodeFiles();
```

获取所有代码文件（根据文件扩展名判断）。

支持的代码文件类型包括：
- JavaScript/TypeScript (`.js`, `.jsx`, `.ts`, `.tsx`, `.mjs`, `.cjs`)
- Python (`.py`, `.pyw`, `.pyx`)
- Java/Kotlin (`.java`, `.kt`, `.kts`)
- C/C++ (`.c`, `.cpp`, `.cc`, `.h`, `.hpp`)
- Go (`.go`)
- Rust (`.rs`)
- PHP (`.php`)
- Ruby (`.rb`)
- 以及更多...

### setCodeOnly(codeOnly: boolean)

```typescript
workspace.setCodeOnly(true);  // 只遍历代码文件
workspace.setCodeOnly(false); // 遍历所有文件
```

动态设置是否只遍历代码文件。

### printAllFiles()

```typescript
workspace.printAllFiles();
```

在控制台打印所有文件和目录的信息，包括统计数据。

## FileInfo 接口

```typescript
interface FileInfo {
  filePath: string;      // 文件的完整路径
  relativePath: string;  // 相对于工作区根目录的路径
  isDirectory: boolean;  // 是否为目录
}
```

## 使用示例

### 示例 1: 只遍历代码文件

```typescript
import Workspace from "./workspace";

// 创建时指定只遍历代码文件
const workspace = new Workspace("/path/to/project", true);
const codeFiles = workspace.getAllFiles(); // 只返回代码文件

console.log(`找到 ${codeFiles.length} 个代码文件`);
```

### 示例 2: 获取特定类型的代码文件

```typescript
const workspace = new Workspace("/path/to/project");
const tsFiles = workspace.getCodeFiles()
  .filter(file => file.relativePath.endsWith('.ts'));

console.log(`找到 ${tsFiles.length} 个 TypeScript 文件`);
```

### 示例 3: 按文件类型分组

```typescript
const workspace = new Workspace("/path/to/project");
const codeFiles = workspace.getCodeFiles();

const filesByType = new Map<string, number>();
codeFiles.forEach(file => {
  const ext = file.relativePath.split('.').pop() || 'unknown';
  filesByType.set(ext, (filesByType.get(ext) || 0) + 1);
});

console.log('代码文件统计:');
filesByType.forEach((count, ext) => {
  console.log(`  .${ext}: ${count} 个文件`);
});
```

## VSCode 命令

插件提供了以下命令：

### Smart Ant: 列出所有文件

- **命令 ID**: `smart-ant.listFiles`
- **功能**: 在控制台打印当前工作区的所有文件和目录
- **使用**: 按 `Cmd+Shift+P` (Mac) 或 `Ctrl+Shift+P` (Windows/Linux)，输入 "Smart Ant: 列出所有文件"

### Smart Ant: 列出所有代码文件

- **命令 ID**: `smart-ant.listCodeFiles`
- **功能**: 在控制台打印当前工作区的所有代码文件，并按文件类型分组显示
- **使用**: 按 `Cmd+Shift+P` (Mac) 或 `Ctrl+Shift+P` (Windows/Linux)，输入 "Smart Ant: 列出所有代码文件"

## 注意事项

1. `.gitignore` 文件必须位于工作区根目录
2. 如果没有 `.gitignore` 文件，只会排除 `.git` 目录
3. 遍历大型项目时可能需要一些时间
4. 确保有足够的文件系统权限访问目录

## 错误处理

- 如果无法读取某个目录，会在控制台输出错误信息并继续遍历其他目录
- 如果 `.gitignore` 文件读取失败，会使用默认规则（只排除 `.git`）

