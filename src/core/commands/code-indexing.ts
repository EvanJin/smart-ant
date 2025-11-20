import * as vscode from "vscode";
import { Workspace, FileChangeType } from "@/core/workspace";
import { OpenAIClient } from "@/core/openai";
import { QdrantCoreClient } from "@/core/qdrant";
import { BaseCommand } from "./base";
import { inject, injectable } from "inversify";
import { MerkleTreeStats } from "@/core/merkel/types";
import { FileChange } from "@/core/workspace/types";

/**
 * 代码索引命令类
 *
 * 负责构建和管理代码索引，包括：
 * - 构建 Merkle 树索引
 * - 生成代码块的向量嵌入
 * - 同步向量数据到 Qdrant 数据库
 * - 支持增量更新和全量重建两种模式
 */
@injectable()
export class CodeIndexingCommand extends BaseCommand {
  command = "smart-ant.codeIndexing";

  constructor(
    @inject(Workspace) private readonly workspace: Workspace,
    @inject(QdrantCoreClient) private readonly qdrantClient: QdrantCoreClient,
    @inject(OpenAIClient) private readonly openaiClient: OpenAIClient
  ) {
    super();
  }

  /**
   * 执行增量更新
   *
   * 只处理变更的文件，包括：
   * 1. 为变更的代码块生成向量嵌入
   * 2. 增量更新 Qdrant 向量数据库
   *
   * @param changes - 文件变更列表
   * @param progress - VSCode 进度报告器
   */
  private async doIncrementalUpdate(
    changes: FileChange[],
    progress: vscode.Progress<{
      message?: string;
      increment?: number;
    }>
  ) {
    // 增量更新向量数据库
    progress.report({ message: "正在增量更新向量数据..." });

    // 只为变更的文件生成嵌入
    const changedChunks = changes
      .filter((c) => c.changeType !== FileChangeType.DELETED)
      .flatMap((c) => this.workspace.getCodeChunksByFile(c.relativePath) || []);

    if (changedChunks.length > 0) {
      progress.report({ message: "正在生成文本向量..." });
      console.log(
        `\n=== 为 ${changedChunks.length} 个变更的 chunks 生成向量 ===`
      );

      const contents = changedChunks.map((chunk) => chunk.content);
      const embeddings = await this.openaiClient.createEmbeddings(
        contents,
        100,
        (batchIndex, totalBatches, current, total) => {
          progress.report({
            message: `第 ${batchIndex}/${totalBatches} 批处理完成，已生成 ${current}/${total} 个 embedding`,
          });
        }
      );

      // 分配 embeddings
      for (let i = 0; i < changedChunks.length; i++) {
        if (embeddings[i] && embeddings[i].length > 0) {
          changedChunks[i].embedding = embeddings[i];
        }
      }
    }

    // 增量更新 Qdrant
    progress.report({ message: "正在更新向量数据库..." });
    console.log("\n=== 增量更新向量数据库 ===");

    const updateResult = await this.qdrantClient.incrementalUpdate(
      changes,
      (relativePath) => this.workspace.getCodeChunksByFile(relativePath)
    );

    console.log("\n=== 向量数据库更新结果 ===");
    console.log(`删除: ${updateResult.deleted} 个文件`);
    console.log(`插入: ${updateResult.inserted} 个 chunks`);
    console.log(`错误: ${updateResult.errors.length} 个`);

    if (updateResult.errors.length > 0) {
      console.log("\n错误详情:");
      updateResult.errors.slice(0, 10).forEach((err) => {
        console.log(`  ${err.file}: ${err.error}`);
      });
      if (updateResult.errors.length > 10) {
        console.log(`  ... 还有 ${updateResult.errors.length - 10} 个错误`);
      }
    }
  }

  /**
   * 执行全量构建
   *
   * 重新处理所有文件，包括：
   * 1. 为所有代码块生成向量嵌入
   * 2. 批量插入到 Qdrant 向量数据库
   *
   * @param progress - VSCode 进度报告器
   */
  private async doFullBuild(
    progress: vscode.Progress<{
      message?: string;
      increment?: number;
    }>
  ) {
    // 全量更新（原有逻辑）
    const allChunks = this.workspace.getAllCodeChunks();
    console.log(
      `\n总共生成的 chunks 数: ${allChunks.length}, 以及 chunks 详情\n`
    );

    progress.report({ message: "正在生成文本向量..." });
    console.log("\n=== 批量生成文本向量 ===");

    try {
      const contents = allChunks.map((chunk) => chunk.content);
      const embeddings = await this.openaiClient.createEmbeddings(
        contents,
        100,
        (batchIndex, totalBatches, current, total) => {
          progress.report({
            message: `第 ${batchIndex}/${totalBatches} 批处理完成，已生成 ${current}/${total} 个 embedding`,
          });
        }
      );

      let successCount = 0;
      let failCount = 0;

      for (let i = 0; i < allChunks.length; i++) {
        if (embeddings[i] && embeddings[i].length > 0) {
          allChunks[i].embedding = embeddings[i];
          successCount++;
        } else {
          console.error(`Chunk ${allChunks[i].id} 的 embedding 为空`);
          failCount++;
        }
      }

      console.log(
        `\n批量 embedding 生成完成: 成功 ${successCount} 个，失败 ${failCount} 个`
      );
    } catch (error) {
      console.error("批量生成 embedding 失败:", error);
      throw error;
    }

    progress.report({ message: "正在更新向量数据..." });
    console.log("\n=== 插入向量数据库 ===");

    const insertResult = await this.qdrantClient.batchInsertChunks(allChunks);

    console.log("\n=== 插入结果 ===");
    console.log(`成功: ${insertResult.success} 个`);
    console.log(`失败: ${insertResult.failed} 个`);

    if (insertResult.errors.length > 0) {
      console.log("\n错误详情:");
      insertResult.errors.slice(0, 10).forEach((err) => {
        console.log(`  ${err.chunkId}: ${err.error}`);
      });
      if (insertResult.errors.length > 10) {
        console.log(`  ... 还有 ${insertResult.errors.length - 10} 个错误`);
      }
    }
  }

  /**
   * 显示索引模式选择快速选择器
   *
   * 提供两种索引模式供用户选择：
   * - 增量更新：只处理变更的文件（推荐）
   * - 全量重建：重新索引所有文件
   *
   * @returns 用户选择的模式选项，如果用户取消则返回 undefined
   */
  private async showQuickPickMode() {
    return await vscode.window.showQuickPick(
      [
        {
          label: "增量更新",
          value: false,
          description: "只处理变更的文件（推荐）",
          detail: "检测文件变更，只重新索引修改、新增或删除的文件",
        },
        {
          label: "全量重建",
          value: true,
          description: "重新索引所有文件",
          detail: "清除现有索引，重新处理所有文件",
        },
      ],
      {
        placeHolder: "选择索引模式",
      }
    );
  }

  /**
   * 执行代码索引命令
   *
   * 主要流程：
   * 1. 验证工作区
   * 2. 获取 Git 仓库哈希并设置集合名称
   * 3. 让用户选择索引模式（增量/全量）
   * 4. 构建代码索引（Merkle 树）
   * 5. 验证索引完整性
   * 6. 生成向量嵌入并同步到 Qdrant
   * 7. 显示构建结果
   *
   * @returns VSCode 命令注册的 Disposable 对象
   */
  execute() {
    return vscode.commands.registerCommand(this.command, async () => {
      if (!this.workspace) {
        vscode.window.showErrorMessage("未检测到工作区");
        return;
      }

      const repo = await this.workspace.getRepoHash();
      console.log(`Git 仓库信息获取成功: ${repo}`);

      // 设置集合名称
      this.qdrantClient.setCollectionName(repo);

      // 询问用户是否强制全量更新
      const modeSelection = await this.showQuickPickMode();
      if (modeSelection === undefined) {
        return;
      }
      // 是否强制全量重建
      const forceFullRebuild = modeSelection.value;

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

            // 增量构建代码索引
            const { stats, changes, isIncremental } =
              this.workspace.buildCodeIndexIncremental(
                {
                  maxChunkSize: 4096,
                  minChunkSize: 512,
                  overlapLines: 2,
                },
                forceFullRebuild
              );

            // 显示统计信息
            console.log("\n=== 代码索引统计 ===");
            console.log(`模式: ${isIncremental ? "增量更新" : "全量构建"}`);
            console.log(`变更文件数: ${changes.length}`);
            console.log(`总文件数: ${stats.totalFiles}`);
            console.log(`总 chunk 数: ${stats.totalChunks}`);
            console.log(`总大小: ${(stats.totalSize / 1024).toFixed(2)} KB`);
            console.log(`根哈希: ${stats.rootHash.substring(0, 16)}...`);
            console.log(`构建时间: ${stats.buildTime}ms`);

            // 验证索引
            const isValid = this.workspace.verifyCodeIndex();
            console.log(`索引验证: ${isValid ? "✓ 通过" : "✗ 失败"}`);
            if (!isValid) {
              vscode.window.showErrorMessage("代码索引验证失败，请重新构建");
              return;
            }

            // 处理向量数据库更新
            if (isIncremental && changes.length > 0) {
              await this.doIncrementalUpdate(changes, progress);
            } else {
              await this.doFullBuild(progress);
            }
            progress.report({ message: "代码索引构建完成！" });
          }
        );

        // 显示成功消息
        const stats = this.workspace.getCodeIndexStats();
        if (stats) {
          const mode = forceFullRebuild ? "全量构建" : "增量更新";
          vscode.window.showInformationMessage(
            `代码索引构建完成！（${mode}）共 ${stats.totalFiles} 个文件，${stats.totalChunks} 个代码块`
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
    });
  }
}
