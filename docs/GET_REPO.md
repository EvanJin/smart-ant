# getRepo 方法文档

## 概述

`getRepo()` 方法用于获取当前工作目录的 Git remote 地址。如果 remote 不存在或无法获取，则返回当前工作目录的根路径。

## 方法签名

```typescript
async getRepo(): Promise<string>
```

## 返回值

- **Git Remote URL**: 如果工作区是 Git 仓库且配置了 remote，返回 remote URL
  - 优先返回 `origin` remote 的 URL
  - 如果没有 `origin`，返回第一个可用的 remote URL
  - 支持 HTTPS 和 SSH 格式的 URL

- **工作区路径**: 在以下情况下返回工作区根路径：
  - Git 扩展未找到
  - 工作区不是 Git 仓库
  - Git 仓库没有配置 remote
  - 获取过程中发生错误

## 使用示例

### 基本用法

```typescript
import { Workspace } from "@/core/workspace";

const workspace = new Workspace("/path/to/workspace", true);

// 获取 repo 信息
const repo = await workspace.getRepo();
console.log(`Repository: ${repo}`);
```

### 判断是否为 Git URL

```typescript
const repo = await workspace.getRepo();
const isGitUrl = repo.startsWith("http") || repo.startsWith("git@");

if (isGitUrl) {
  console.log(`Git remote URL: ${repo}`);
} else {
  console.log(`Local workspace path: ${repo}`);
}
```

### 在 VSCode 扩展中使用

```typescript
import * as vscode from "vscode";
import { Workspace } from "@/core/workspace";

export function activate(context: vscode.ExtensionContext) {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  
  if (workspaceFolders && workspaceFolders.length > 0) {
    const workspace = new Workspace(workspaceFolders[0].uri.fsPath, true);
    
    workspace.getRepo().then((repo) => {
      const isGitUrl = repo.startsWith("http") || repo.startsWith("git@");
      const repoInfo = isGitUrl ? `Git: ${repo}` : `本地: ${repo}`;
      
      vscode.window.showInformationMessage(
        `工作区: ${workspace.getWorkspaceName()} (${repoInfo})`
      );
    });
  }
}
```

## 返回值示例

### Git Remote URL (HTTPS)

```
https://github.com/EvanJin/smart-ant.git
```

### Git Remote URL (SSH)

```
git@github.com:EvanJin/smart-ant.git
```

### 本地路径

```
/Users/username/workspace/my-project
```

## 实现细节

1. **Git 扩展检查**: 首先检查 VSCode 的 Git 扩展是否可用
2. **仓库查找**: 在所有 Git 仓库中查找匹配当前工作区路径的仓库
3. **Remote 优先级**: 
   - 优先使用名为 `origin` 的 remote
   - 如果没有 `origin`，使用第一个可用的 remote
4. **URL 选择**: 
   - 优先使用 `fetchUrl`
   - 如果 `fetchUrl` 不存在，使用 `pushUrl`
5. **错误处理**: 所有异常都会被捕获，并返回工作区路径作为后备方案

## 日志输出

方法会在控制台输出以下日志：

- **成功找到 remote**: `Found git remote: <url>`
- **Git 扩展未找到**: `Git extension not found, returning workspace path`
- **没有 Git 仓库**: `No git repositories found, returning workspace path`
- **没有 remote URL**: `No remote URL found, returning workspace path`
- **发生错误**: `Error getting git repo: <error>`

## 注意事项

1. 该方法是异步的，需要使用 `await` 或 `.then()` 处理返回值
2. 方法依赖 VSCode 的 Git 扩展，确保扩展已启用
3. 如果工作区有多个 Git 仓库，会优先匹配当前工作区路径
4. 方法保证始终返回一个有效的字符串（remote URL 或路径）

## 相关方法

- `getWorkspaceName()`: 获取工作区名称
- `buildCodeIndex()`: 构建代码索引
- `getAllCodeChunks()`: 获取所有代码块

## 更新日志

- **v0.0.1**: 初始实现，支持获取 Git remote URL 或返回工作区路径

