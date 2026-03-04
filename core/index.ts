import { YAML } from "bun";
import { ActionListener, ActionsSchema } from "./src/actions/index.ts";
import { generate } from "./src/agent/skill.ts";
import { TransitionEngine } from "./src/transition/engine/index.ts";
import { TransitionsSchema } from "./src/transition/schema/index.ts";
import { createEventEmitter as createTransitionEmitter } from "./src/transition/transport/index.ts";
import type { OutputMessage } from "./src/transition/transport/messages.ts";

async function main() {
	let transitionsFile = Bun.file("./data/transitions.yml");
	let actionsFile = Bun.file("./data/actions.yml");

	const exists =
		(await transitionsFile.exists()) && (await actionsFile.exists());

	if (!exists) {
		generate();
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

	const transitionsEmitter = createTransitionEmitter(transitionEngine);

	transitionsEmitter.on("output", (output: OutputMessage) => {
		const res = listener.check(output.parameter);
		console.log(res);
	});

	transitionsEmitter.emit(
		"input",
		JSON.stringify({
			type: "input",
			event: "msg",
			data: { content: "Hello!" },
		}),
	);

	setInterval(() => {
		transitionsEmitter.emit(
			"input",
			JSON.stringify({
				type: "input",
				event: "tick",
				data: { timestamp: Date.now() },
			}),
		);
	}, 1000);
}

main().catch(console.error);
