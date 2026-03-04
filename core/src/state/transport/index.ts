import { EventEmitter } from "node:events";
import { OutputMessageSchema } from "../../transition/transport/messages.ts";
import type { ParameterValues } from "../../transition/types.ts";
import type { StateEngine } from "../engine/index.ts";

export function createStateEventEmitter(
	transitionsEmitter: EventEmitter,
	stateEngine: StateEngine,
) {
	const stateEmitter = new EventEmitter();

	let paramBuffer: Partial<ParameterValues> = {};

	transitionsEmitter.on("output", (rawMessage: unknown) => {
		try {
			const output = OutputMessageSchema.parse(rawMessage);
			paramBuffer[output.parameter as keyof ParameterValues] = output.value;

			if (Object.keys(paramBuffer).length === 4) {
				const action = stateEngine.processParameters(
					paramBuffer as ParameterValues,
				);

				if (action) {
					stateEmitter.emit("action", {
						type: "action",
						action: action,
						timestamp: Date.now(),
					});
				}

				paramBuffer = {};
			}
		} catch (e) {
			console.error("Failed to process output message", e);
		}
	});

	stateEmitter.once("close", () => {
		stateEmitter.removeAllListeners();
	});

	return stateEmitter;
}
