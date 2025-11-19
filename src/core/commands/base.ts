import * as vscode from "vscode";

export abstract class BaseCommand {
  abstract command: string;

  abstract execute(): vscode.Disposable | null;
}
