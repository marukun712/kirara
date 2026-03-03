import { YAML } from "bun";
import { Scheduler } from "./src/agent/scheduler.ts";
import { generateTransitions } from "./src/agent/skill.ts";
import { TransitionsSchema } from "./src/dsl/schema.ts";
import { StateMachineEngine } from "./src/engine/index.ts";
import { createWebSocketServer } from "./src/websocket/server.ts";

async function main() {
	const yamlContent = await generateTransitions();
	const rules = TransitionsSchema.parse(YAML.parse(yamlContent));

	const engine = new StateMachineEngine(rules);

	createWebSocketServer(engine, 8080);
	console.log("ws://localhost:8080");

	const scheduler = new Scheduler(engine);
	scheduler.start();
}

main().catch(console.error);
