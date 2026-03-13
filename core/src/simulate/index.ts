import { evaluate } from "mathjs";
import type { Action, Character, Transition } from "../schema/index.ts";

export type SimulateReport = {
	ok: boolean;
	saturated: string[];
	actionDistribution: Record<string, number>;
	reactive: boolean;
};

function applyTransitions(
	params: Record<string, number>,
	transitions: Transition[],
	eventKind: string,
	eventData: unknown = {},
): Record<string, number> {
	const next = { ...params };
	for (const t of transitions.filter((t) => t.on === eventKind)) {
		try {
			const value = evaluate(t.expression, { params: next, event: eventData });
			next[t.param] = Math.max(0, Math.min(1, value));
		} catch {}
	}
	return next;
}

function evalActions(
	params: Record<string, number>,
	actions: Action[],
): string | null {
	let best: string | null = null;
	let bestScore = -Infinity;
	for (const a of actions) {
		try {
			const score = evaluate(a.expression, { params });
			if (score > bestScore) {
				bestScore = score;
				best = a.name;
			}
		} catch {}
	}
	return best;
}

export function simulate(char: Character) {
	const TICKS = 300;
	const timeline: Array<{
		tick: number;
		event: string;
		params: Record<string, number>;
		action: string | null;
	}> = [];

	let params = Object.fromEntries(
		Object.entries(char.params).map(([k, v]) => [k, v.normal]),
	);

	for (let i = 0; i < TICKS; i++) {
		const eventKind = i === 50 ? "mention" : i === 100 ? "msg" : "tick";
		const eventData =
			eventKind === "tick"
				? { timestamp: new Date().toISOString() }
				: { from: "test", content: "hello" };

		params = applyTransitions(params, char.transitions, eventKind, eventData);
		const action = evalActions(params, char.actions);
		if (action && action !== "do_nothing") {
			params = applyTransitions(params, char.transitions, "effect", {});
		}

		if (i % 10 === 0 || eventKind !== "tick") {
			timeline.push({
				tick: i,
				event: eventKind,
				params: Object.fromEntries(
					Object.entries(params).map(([k, v]) => [
						k,
						Math.round(v * 1000) / 1000,
					]),
				),
				action,
			});
		}
	}

	return timeline;
}
