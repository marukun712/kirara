import { evaluate } from "mathjs";
import type { Action } from "../schema/index.ts";

export function evalActions(
	params: Record<string, number>,
	actions: Action[],
): string | null {
	let bestName: string | null = null;
	let bestScore = -Infinity;

	for (const action of actions) {
		try {
			const r = evaluate(action.expression, { params });
			const value = r?.entries ? r.entries.at(-1) : r;
			if (value > bestScore) {
				bestScore = value;
				bestName = action.name;
			}
		} catch (e) {
			console.error(e);
		}
	}

	return bestName;
}
