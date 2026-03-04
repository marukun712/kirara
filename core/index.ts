import { type ServerWebSocket, serve, YAML } from "bun";
import { ActionListener, ActionsSchema } from "./src/actions/index.ts";
import { generate } from "./src/agent/skill.ts";
import { TransitionEngine } from "./src/transition/engine/index.ts";
import { TransitionsSchema } from "./src/transition/schema/index.ts";
import { createEventEmitter } from "./src/transition/transport/index.ts";
import type { OutputMessage } from "./src/transition/transport/messages.ts";
import { InputMessageSchema } from "./src/transition/transport/messages.ts";

async function setup() {
	let transitionsFile = Bun.file("./data/transitions.yml");
	let actionsFile = Bun.file("./data/actions.yml");

	const exists =
		(await transitionsFile.exists()) && (await actionsFile.exists());

	if (!exists) {
		await generate();
		transitionsFile = Bun.file("./data/transitions.yml");
		actionsFile = Bun.file("./data/actions.yml");
	}

	const transitionsText = await transitionsFile.text();
	const transitionsConfig = TransitionsSchema.parse(
		YAML.parse(transitionsText),
	);
	const transitionEngine = new TransitionEngine(transitionsConfig);

	const actionsText = await actionsFile.text();
	const actionsConfig = ActionsSchema.parse(YAML.parse(actionsText));
	const listener = new ActionListener(actionsConfig);

	const transitionsEmitter = createEventEmitter(transitionEngine);

	return { transitionsEmitter, listener };
}

const { transitionsEmitter, listener } = await setup();

const clients = new Set<ServerWebSocket>();

transitionsEmitter.on("output", (output: OutputMessage) => {
	const res = listener.check(output.parameter);
	const json = JSON.stringify(res);
	for (const ws of clients) {
		if (ws.readyState === 1) ws.send(json);
	}
});

serve({
	port: 3000,
	fetch(req, server) {
		if (server.upgrade(req)) return;
		return new Response("Upgrade Required", { status: 426 });
	},
	websocket: {
		open(ws) {
			clients.add(ws);
		},
		close(ws) {
			clients.delete(ws);
		},
		message(_ws, message) {
			try {
				const parsed = InputMessageSchema.safeParse(
					JSON.parse(message.toString()),
				);
				if (!parsed.success) return;
				transitionsEmitter.emit("input", JSON.stringify(parsed.data));
			} catch (e) {
				console.error(e);
			}
		},
	},
});
