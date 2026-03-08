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
			const score = evaluate(action.expression, { params });
			console.log(action.name, score);
			if (score > bestScore) {
				bestScore = score;
				bestName = action.name;
			}
		} catch (e) {
			console.error(e);
		}
	}

	return bestName;
}
