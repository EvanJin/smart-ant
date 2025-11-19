// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import "reflect-metadata";
import * as vscode from "vscode";
import { Workspace } from "@/core/workspace";
import container from "@/core";
import { CodeIndexingCommand } from "@/core/commands/code-indexing";
import { SearchCommand } from "@/core/commands/search";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  // 读取当前工程目录
  const workspaceFolders = vscode.workspace.workspaceFolders;

  if (!workspaceFolders || workspaceFolders.length === 0) {
    vscode.window.showWarningMessage("Smart Ant: 未检测到打开的工作区");
    return;
  }

  // 默认只遍历代码文件
  container.get(Workspace).initialize(workspaceFolders[0].uri.fsPath, true);

  // 添加命令：构建代码索引
  const codeIndexingCommand =
    container.get<CodeIndexingCommand>(CodeIndexingCommand);

  const codeIndexingDisposable = codeIndexingCommand.execute();
  context.subscriptions.push(codeIndexingDisposable);

  // 添加命令：搜索代码
  const searchCodeCommand = container.get<SearchCommand>(SearchCommand);
  const searchCodeDisposable = searchCodeCommand.execute();
  if (searchCodeDisposable) {
    context.subscriptions.push(searchCodeDisposable);
  }
}

// This method is called when your extension is deactivated
export function deactivate() {}
