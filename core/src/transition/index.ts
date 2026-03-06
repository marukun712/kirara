import { Environment } from "@marcbachmann/cel-js";
import { assign, createMachine } from "xstate";
import type { Character } from "../schema/index.ts";

const ACTIVE_THRESHOLD = 0.3;

export function createTransitionMachine(
	character: Character,
	trigger: () => void,
) {
	const env = new Environment();
	env.registerVariable("event", "map");
	env.registerVariable("params", "map");

	return createMachine(
		{
			context: {
				params: Object.fromEntries(
					Object.entries(character.params).map(([name, def]) => [
						name,
						def.initial,
					]),
				),
				preferred: Object.fromEntries(
					Object.entries(character.params).map(([name, def]) => [
						name,
						def.preferred,
					]),
				),
				transitions: character.transitions,
			},
			initial: "idle",
			states: {
				idle: {
					on: {
						PROCESS_EVENT: {
							guard: "checkActive",
							target: "active",
						},
					},
				},
				active: {
					entry: "callTrigger",
					on: {
						PROCESS_EVENT: {
							guard: "checkIdle",
							target: "idle",
						},
					},
				},
			},
			on: {
				PROCESS_EVENT: {
					actions: "updateParams",
				},
				UPDATE_RULES: {
					actions: assign({
						transitions: ({ event }) => event.transitions,
					}),
				},
			},
		},
		{
			guards: {
				checkActive: ({ context }) =>
					Object.entries(context.params).some(
						([k, v]) =>
							Math.abs(v - (context.preferred[k] ?? 0.5)) > ACTIVE_THRESHOLD,
					),
				checkIdle: ({ context }) =>
					!Object.entries(context.params).some(
						([k, v]) =>
							Math.abs(v - (context.preferred[k] ?? 0.5)) > ACTIVE_THRESHOLD,
					),
			},
			actions: {
				updateParams: assign({
					params: ({ context, event }) => {
						const matched = context.transitions.filter(
							(t) => t.event === event.eventType,
						);
						if (matched.length === 0) return context.params;
						const next = { ...context.params };
						for (const t of matched) {
							try {
								const raw = env.evaluate(t.expression, {
									event: event.eventData,
									params: next,
								});
								const value = typeof raw === "bigint" ? Number(raw) : raw;
								next[t.parameter] = Math.min(1, Math.max(0, value));
							} catch (e) {
								console.error(e);
							}
						}
						return next;
					},
				}),
				callTrigger: () => trigger(),
			},
		},
	);
}
