// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { Workspace } from "@/core/workspace";
import { CodeIndexingCommand } from "@/commands/code-indexing";
import { SearchCommand } from "@/commands/search";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  // 读取当前工程目录
  const workspaceFolders = vscode.workspace.workspaceFolders;
  let workspace: Workspace | null = null;

  if (!workspaceFolders || workspaceFolders.length === 0) {
    vscode.window.showWarningMessage("Smart Ant: 未检测到打开的工作区");
    return;
  }

  // 默认只遍历代码文件
  workspace = new Workspace(workspaceFolders[0].uri.fsPath, true);

  // 获取 repo 信息并显示
  workspace.getRepo().then((repo) => {
    console.log(`Workspace repo: ${repo}`);
    const isGitUrl = repo.startsWith("http") || repo.startsWith("git@");
    const repoInfo = isGitUrl ? `Git: ${repo}` : `本地: ${repo}`;
    
    // 显示通知消息
    vscode.window.showInformationMessage(
      `Smart Ant 已启动 - 工程: ${workspace!.getWorkspaceName()} (${repoInfo})`
    );
  });

  // 添加命令：构建代码索引
  const codeIndexingDisposable = new CodeIndexingCommand(workspace).execute();
  if (codeIndexingDisposable) {
    context.subscriptions.push(codeIndexingDisposable);
  }

  // 添加命令：搜索代码
  const searchCodeDisposable = new SearchCommand(workspace).execute();
  if (searchCodeDisposable) {
    context.subscriptions.push(searchCodeDisposable);
  }
}

// This method is called when your extension is deactivated
export function deactivate() {}
