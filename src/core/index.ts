import { Container } from "inversify";
import { ConfigContainer } from "@/core/config";
import { OpenAIClient } from "@/core/openai";
import { QdrantCoreClient } from "@/core/qdrant";
import { Workspace } from "@/core/workspace";
import { CodeIndexingCommand } from "@/core/commands/code-indexing";
import { SearchCommand } from "@/core/commands/search";

const container = new Container({
  defaultScope: "Singleton",
});

// 绑定核心组件
container.bind(ConfigContainer).toSelf();
container.bind(OpenAIClient).toSelf();
container.bind(QdrantCoreClient).toSelf();
container.bind(Workspace).toSelf();

// 绑定命令
container.bind(CodeIndexingCommand).toSelf();
container.bind(SearchCommand).toSelf();

export default container;
