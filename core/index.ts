import { YAML } from "bun";
import { StateEngine } from "./src/state/engine/index.ts";
import { StatesConfigSchema } from "./src/state/schema/index.ts";
import { createStateEventEmitter } from "./src/state/transport/index.ts";
import { TransitionEngine } from "./src/transition/engine/index.ts";
import { TransitionsSchema } from "./src/transition/schema/index.ts";
import { createEventEmitter as createTransitionEmitter } from "./src/transition/transport/index.ts";

async function main() {
	const transitionsFile = Bun.file("./data/transitions.yml");
	const transitionsText = await transitionsFile.text();
	const transitionsConfig = TransitionsSchema.parse(
		YAML.parse(transitionsText),
	);
	const transitionEngine = new TransitionEngine(transitionsConfig);

	const statesFile = Bun.file("./data/states.yml");
	const statesText = await statesFile.text();
	const statesConfig = StatesConfigSchema.parse(YAML.parse(statesText));
	const stateEngine = new StateEngine(statesConfig);

	const transitionsEmitter = createTransitionEmitter(transitionEngine);
	const stateEmitter = createStateEventEmitter(transitionsEmitter, stateEngine);

	stateEmitter.on("action", (actionMessage) => {
		console.log("Action triggered:", JSON.stringify(actionMessage, null, 2));
		stateEngine.completeAction();
	});

	transitionsEmitter.emit(
		"input",
		JSON.stringify({
			type: "input",
			event: "msg",
			data: { content: "Hello!" },
		}),
	);
}

main().catch(console.error);
