import { YAML } from "bun";
import { RuleRegenerationScheduler } from "./src/agent/scheduler.ts";
import { generateDSL } from "./src/agent/skill.ts";
import { YAMLDSLSchema } from "./src/dsl/schema.ts";
import { StateMachineEngine } from "./src/engine/index.ts";
import { createWebSocketServer } from "./src/websocket/server.ts";

async function main() {
	const yamlContent = await generateDSL();
	const rules = YAMLDSLSchema.parse(YAML.parse(yamlContent));

	const engine = new StateMachineEngine(rules);

	createWebSocketServer(engine, 8080);
	console.log("ws://localhost:8080");

	const scheduler = new RuleRegenerationScheduler(engine);
	scheduler.start();
}

main().catch(console.error);
