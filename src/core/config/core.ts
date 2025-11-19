import { injectable } from "inversify";
import * as vscode from "vscode";
import { SmartAntConfig } from "./types";

@injectable()
export class ConfigContainer {
  config: SmartAntConfig;

  constructor() {
    const configure = vscode.workspace.getConfiguration("smart-ant");
    this.config = {
      openaiApiKey: configure.get("openaiApiKey") || "",
      openaiBaseURL: configure.get("openaiBaseURL") || "",
      openaiModel: configure.get("openaiModel") || "",
      qdrantUrl: configure.get("qdrantUrl") || "",
      qdrantApiKey: configure.get("qdrantApiKey") || "",
    };
  }
}
