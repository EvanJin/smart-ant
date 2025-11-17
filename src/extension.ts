// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import Workspace from "@/core/workspace";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log('Congratulations, your extension "smart-ant" is now active!');

  // 读取当前工程目录
  const workspaceFolders = vscode.workspace.workspaceFolders;
  let workspace: Workspace | null = null;

  if (workspaceFolders && workspaceFolders.length > 0) {
    // 默认只遍历代码文件
    workspace = new Workspace(workspaceFolders[0].uri.fsPath, true);

    // 显示通知消息
    vscode.window.showInformationMessage(
      `Smart Ant 已启动 - 工程: ${workspace.getWorkspaceName()}`
    );
  } else {
    console.log("未检测到工作区文件夹");
    vscode.window.showWarningMessage("Smart Ant: 未检测到打开的工作区");
  }

  // 添加命令：构建代码索引
  const codeIndexingDisposable = vscode.commands.registerCommand(
    "smart-ant.codeIndexing",
    async () => {
      if (!workspace) {
        vscode.window.showErrorMessage("未检测到工作区");
        return;
      }

      try {
        // 显示进度提示
        await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: "Smart Ant",
            cancellable: false,
          },
          async (progress) => {
            progress.report({ message: "正在构建代码索引..." });

            // 构建代码索引
            const stats = workspace.buildCodeIndex({
              maxChunkSize: 4096,
              minChunkSize: 512,
              overlapLines: 2,
            });

            // 显示统计信息
            console.log("\n=== 代码索引统计 ===");
            console.log(`总文件数: ${stats.totalFiles}`);
            console.log(`总 chunk 数: ${stats.totalChunks}`);
            console.log(`总大小: ${(stats.totalSize / 1024).toFixed(2)} KB`);
            console.log(`根哈希: ${stats.rootHash.substring(0, 16)}...`);
            console.log(`构建时间: ${stats.buildTime}ms`);

            // 验证索引
            const isValid = workspace.verifyCodeIndex();
            console.log(`索引验证: ${isValid ? "✓ 通过" : "✗ 失败"}`);

            // 获取所有 chunks
            const allChunks = workspace.getAllCodeChunks();
            console.log(`\n总共生成 ${allChunks.length} 个代码块`);

            // 按文件分组显示前几个 chunks
            const codeFiles = workspace.getCodeFiles();
            console.log("\n=== 代码块示例 (前3个文件) ===");
            codeFiles.slice(0, 3).forEach((file) => {
              const chunks = workspace.getCodeChunksByFile(file.relativePath);
              if (chunks) {
                console.log(`\n文件: ${file.relativePath}`);
                console.log(`  Chunks: ${chunks.length} 个`);
                chunks.forEach((chunk, idx) => {
                  console.log(
                    `    [${idx + 1}] ${chunk.id} (${chunk.size}B, 行 ${
                      chunk.startLine
                    }-${chunk.endLine})`
                  );
                });
              }
            });

            progress.report({ message: "代码索引构建完成！" });

            return stats;
          }
        );

        // 显示成功消息
        const stats = workspace.getCodeIndexStats();
        if (stats) {
          vscode.window.showInformationMessage(
            `代码索引构建完成！共 ${stats.totalFiles} 个文件，${stats.totalChunks} 个代码块`
          );
        }
      } catch (error) {
        console.error("构建代码索引失败:", error);
        vscode.window.showErrorMessage(
          `构建代码索引失败: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }
  );

  context.subscriptions.push(codeIndexingDisposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
