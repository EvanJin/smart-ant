import * as vscode from "vscode";
import { Workspace } from "@/core/workspace";
import { QdrantClient } from "@/core/qdrant";
import { OpenAIClient } from "@/core/openai";
import { BaseCommand } from "./base";

export class SearchCommand extends BaseCommand {
  command = "smart-ant.searchCode";

  constructor(workspace: Workspace) {
    super(workspace);
  }

  execute() {
    if (!this.workspace) {
      vscode.window.showErrorMessage("未检测到工作区");
      return null;
    }

    return vscode.commands.registerCommand(this.command, async () => {
      try {
        // 1. 设置 Qdrant 集合名称
        const repo = await this.workspace.getRepoHash();
        QdrantClient.setCollectionName(repo);

        // 1. 获取用户输入的搜索查询
        const query = await vscode.window.showInputBox({
          prompt: "请输入搜索内容（描述你想找的代码功能）",
          placeHolder: "例如：文件上传功能、数据库连接、API 请求等",
        });

        if (!query) {
          return;
        }

        // 2. 显示进度
        await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: "Smart Ant",
            cancellable: false,
          },
          async (progress) => {
            progress.report({ message: "正在搜索代码..." });

            // 3. 使用 Qdrant 搜索
            const results = await QdrantClient.searchByText(
              query,
              10,
              async (text) => {
                return await OpenAIClient.createEmbedding(text);
              }
            );

            if (results.length === 0) {
              vscode.window.showInformationMessage(
                "未找到相关代码，请尝试其他关键词"
              );
              return;
            }

            // 4. 创建结果文档
            const resultContent = [
              `# 代码搜索结果`,
              ``,
              `**查询**: ${query}`,
              `**找到**: ${results.length} 个相关代码块`,
              ``,
              ...results.map((result, idx) => {
                const { chunk, score } = result;
                return [
                  `## ${idx + 1}. ${chunk.relativePath} (相似度: ${(
                    score * 100
                  ).toFixed(2)}%)`,
                  ``,
                  `- **位置**: 行 ${chunk.startLine}-${chunk.endLine}`,
                  `- **大小**: ${chunk.size} 字节`,
                  `- **哈希**: ${chunk.hash.substring(0, 16)}...`,
                  ``,
                  `### 代码内容`,
                  ``,
                  "```" + (chunk.relativePath.split(".").pop() || "text"),
                  chunk.content,
                  "```",
                  ``,
                ].join("\n");
              }),
            ].join("\n");

            // 6. 在新编辑器中显示结果
            const doc = await vscode.workspace.openTextDocument({
              content: resultContent,
              language: "markdown",
            });
            await vscode.window.showTextDocument(doc);

            // 7. 显示成功消息
            vscode.window.showInformationMessage(
              `找到 ${results.length} 个相关代码块`
            );
          }
        );
      } catch (error) {
        console.error("搜索代码失败:", error);
        vscode.window.showErrorMessage(
          `搜索代码失败: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    });
  }
}
