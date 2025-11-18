import * as vscode from "vscode";
import Workspace from "@/core/workspace/core";

export abstract class BaseCommand {
  protected workspace: Workspace;

  abstract command: string;

  constructor(workspace: Workspace) {
    this.workspace = workspace;
  }

  abstract execute(): vscode.Disposable | null;
}
