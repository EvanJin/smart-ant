import { injectable } from "inversify";
import * as vscode from "vscode";
import { SmartAntConfig } from "./types";

@injectable()
export class ConfigContainer {
  config: SmartAntConfig;

  constructor() {
    this.config = {
      openaiApiKey:
        vscode.workspace.getConfiguration("smart-ant").get("openaiApiKey") ||
        "",
      openaiBaseURL:
        vscode.workspace.getConfiguration("smart-ant").get("openaiBaseURL") ||
        "",
      openaiModel:
        vscode.workspace.getConfiguration("smart-ant").get("openaiModel") || "",
      qdrantUrl:
        vscode.workspace.getConfiguration("smart-ant").get("qdrantUrl") || "",
      qdrantApiKey:
        vscode.workspace.getConfiguration("smart-ant").get("qdrantApiKey") ||
        "",
    };
  }
}
