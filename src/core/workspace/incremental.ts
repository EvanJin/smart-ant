import fs from "fs";
import crypto from "crypto";
import * as vscode from "vscode";
import { FileInfo, FileChange, FileChangeType, IndexState } from "./types";
import { injectable } from "inversify";

/**
 * 增量更新管理器
 *
 * 负责检测文件变更、管理索引状态、执行增量更新
 * 使用 VSCode 的 workspaceState 存储索引状态
 */
@injectable()
export class IncrementalUpdateManager {
  /** VSCode 扩展上下文 */
  private context: vscode.ExtensionContext | null = null;

  /** 工作区路径（用作 state key 的一部分） */
  private workspacePath: string = "";

  /** 当前索引状态 */
  private currentState: IndexState | null = null;

  /** 状态存储的 key 前缀 */
  private readonly STATE_KEY_PREFIX = "smart-ant.indexState";

  /**
   * 初始化增量更新管理器
   * @param context VSCode 扩展上下文
   * @param workspacePath 工作区路径
   */
  initialize(context: vscode.ExtensionContext, workspacePath: string): void {
    this.context = context;
    this.workspacePath = workspacePath;
    this.loadState();
  }

  /**
   * 获取状态存储的 key
   */
  private getStateKey(): string {
    // 使用工作区路径的哈希作为 key 的一部分，确保不同工作区的状态独立
    const pathHash = crypto
      .createHash("md5")
      .update(this.workspacePath)
      .digest("hex")
      .substring(0, 8);
    return `${this.STATE_KEY_PREFIX}.${pathHash}`;
  }

  /**
   * 加载索引状态
   */
  private loadState(): void {
    try {
      if (!this.context) {
        console.warn("VSCode 上下文未初始化");
        this.currentState = null;
        return;
      }

      const stateKey = this.getStateKey();
      const savedState = this.context.workspaceState.get<IndexState>(stateKey);

      if (savedState) {
        this.currentState = savedState;
        console.log(
          `加载索引状态: ${this.currentState.totalFiles} 个文件 (key: ${stateKey})`
        );
      } else {
        console.log("未找到索引状态，将进行全量索引");
        this.currentState = null;
      }
    } catch (error) {
      console.error("加载索引状态失败:", error);
      this.currentState = null;
    }
  }

  /**
   * 保存索引状态
   * @param state 索引状态
   */
  async saveState(state: IndexState): Promise<void> {
    try {
      if (!this.context) {
        console.warn("VSCode 上下文未初始化，无法保存状态");
        return;
      }

      const stateKey = this.getStateKey();
      await this.context.workspaceState.update(stateKey, state);

      this.currentState = state;
      console.log(
        `保存索引状态: ${state.totalFiles} 个文件 (key: ${stateKey})`
      );
    } catch (error) {
      console.error("保存索引状态失败:", error);
    }
  }

  /**
   * 计算文件哈希
   * @param filePath 文件路径
   * @returns 文件的 SHA256 哈希
   */
  private calculateFileHash(filePath: string): string {
    try {
      const content = fs.readFileSync(filePath, "utf-8");
      return crypto.createHash("sha256").update(content).digest("hex");
    } catch (error) {
      console.error(`计算文件哈希失败: ${filePath}`, error);
      return "";
    }
  }

  /**
   * 检测文件变更
   * @param currentFiles 当前的文件列表
   * @returns 变更的文件列表
   */
  detectChanges(currentFiles: FileInfo[]): FileChange[] {
    const changes: FileChange[] = [];

    // 如果没有历史状态，所有文件都是新增的
    if (!this.currentState) {
      console.log("首次索引，所有文件视为新增");
      return currentFiles.map((file) => ({
        filePath: file.filePath,
        relativePath: file.relativePath,
        changeType: FileChangeType.ADDED,
        newHash: this.calculateFileHash(file.filePath),
      }));
    }

    const oldFileHashes = this.currentState.fileHashes;
    const currentFileMap = new Map<string, FileInfo>();

    // 构建当前文件映射
    for (const file of currentFiles) {
      currentFileMap.set(file.relativePath, file);
    }

    // 检测新增和修改的文件
    for (const file of currentFiles) {
      const newHash = this.calculateFileHash(file.filePath);
      const oldHash = oldFileHashes[file.relativePath];

      if (!oldHash) {
        // 新增文件
        changes.push({
          filePath: file.filePath,
          relativePath: file.relativePath,
          changeType: FileChangeType.ADDED,
          newHash,
        });
      } else if (oldHash !== newHash) {
        // 修改文件
        changes.push({
          filePath: file.filePath,
          relativePath: file.relativePath,
          changeType: FileChangeType.MODIFIED,
          oldHash,
          newHash,
        });
      }
      // 如果哈希相同，则文件未变更，不需要处理
    }

    // 检测删除的文件
    for (const relativePath of Object.keys(oldFileHashes)) {
      if (!currentFileMap.has(relativePath)) {
        changes.push({
          filePath: "", // 文件已删除，没有路径
          relativePath,
          changeType: FileChangeType.DELETED,
          oldHash: oldFileHashes[relativePath],
        });
      }
    }

    console.log(`检测到 ${changes.length} 个文件变更:`);
    console.log(
      `  新增: ${changes.filter((c) => c.changeType === FileChangeType.ADDED).length}`
    );
    console.log(
      `  修改: ${changes.filter((c) => c.changeType === FileChangeType.MODIFIED).length}`
    );
    console.log(
      `  删除: ${changes.filter((c) => c.changeType === FileChangeType.DELETED).length}`
    );

    return changes;
  }

  /**
   * 获取当前索引状态
   */
  getCurrentState(): IndexState | null {
    return this.currentState;
  }

  /**
   * 检查是否需要增量更新
   * @returns 是否有历史状态
   */
  hasState(): boolean {
    return this.currentState !== null;
  }

  /**
   * 清除索引状态（用于强制全量更新）
   */
  async clearState(): Promise<void> {
    try {
      if (!this.context) {
        console.warn("VSCode 上下文未初始化");
        return;
      }

      const stateKey = this.getStateKey();
      await this.context.workspaceState.update(stateKey, undefined);
      this.currentState = null;
      console.log(`索引状态已清除 (key: ${stateKey})`);
    } catch (error) {
      console.error("清除索引状态失败:", error);
    }
  }
}
