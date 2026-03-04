import { EventEmitter } from "node:events";
import type { TransitionEngine } from "../engine/index.ts";
import { InputMessageSchema } from "./messages.ts";

export function createEventEmitter(engine: TransitionEngine) {
	const emitter = new EventEmitter();

	const interval = setInterval(() => {
		const params = engine.getParams();
		emitter.emit("output", {
			type: "output",
			parameter: params,
		});
	}, 500);

	emitter.on("input", (rawMessage: string) => {
		try {
			const message = JSON.parse(rawMessage);
			const input = InputMessageSchema.parse(message);
			const eventSchema =
				config.events[input.event as keyof typeof config.events];
			if (!eventSchema) return;
			const validatedData = eventSchema.parse(input.data);
			engine.processEvent(input.event, validatedData);
		} catch (e) {
			console.error(e);
		}
	});

	emitter.once("close", () => {
		clearInterval(interval);
		emitter.removeAllListeners();
	});

	return emitter;
}
