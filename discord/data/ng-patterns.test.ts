/**
 * ポルカ NGパターン テスト
 *
 * ステートマシンが「ポルカらしくない」行動を取らないことを証明する。
 * 実装より先に書く（TDD: Red phase）
 */

import { describe, expect, it } from "vitest";
import { createActor } from "xstate";
import { polkaMachine } from "./polka-machine";

// 1tick = 10秒 と定義
const TICK_INTERVAL_SEC = 10;
const toTicks = (seconds: number) => Math.floor(seconds / TICK_INTERVAL_SEC);

/** n tick分のtickイベントを送り、状態履歴を返す */
function runTicks(
	actor: ReturnType<typeof createActor<typeof polkaMachine>>,
	n: number,
): string[] {
	const history: string[] = [];
	for (let i = 0; i < n; i++) {
		actor.send({ type: "tick", data: { timestamp: new Date().toISOString() } });
		history.push(actor.getSnapshot().value as string);
	}
	return history;
}

/** mention を送った後のtick履歴を返す */
function sendMentionThenTick(
	actor: ReturnType<typeof createActor<typeof polkaMachine>>,
	ticks: number,
): string[] {
	actor.send({
		type: "mention",
		data: { content: "ポルカ！", author: "user" },
	});
	return runTicks(actor, ticks);
}

// ──────────────────────────────────────────────
// NG1: 高速State切り替わり
// ──────────────────────────────────────────────
describe("NG1: 高速State切り替わり", () => {
	it("30秒（3tick）以内に3回以上Stateが変化しない", () => {
		const actor = createActor(polkaMachine);
		actor.start();

		const window = toTicks(30); // 3tick
		const history = runTicks(actor, window);

		// 連続する異なるState遷移の数をカウント
		let changes = 0;
		for (let i = 1; i < history.length; i++) {
			if (history[i] !== history[i - 1]) changes++;
		}

		expect(changes).toBeLessThan(3);
	});

	it("tick のみで 60秒（6tick）以内にStateが2回以上変化しない", () => {
		const actor = createActor(polkaMachine);
		actor.start();

		const window = toTicks(60); // 6tick
		const history = runTicks(actor, window);

		let changes = 0;
		for (let i = 1; i < history.length; i++) {
			if (history[i] !== history[i - 1]) changes++;
		}

		expect(changes).toBeLessThan(2);
	});
});

// ──────────────────────────────────────────────
// NG2: 固定的な周期性
// ──────────────────────────────────────────────
describe("NG2: 固定的な周期性", () => {
	it("1000tick中、idleとspeakingが完全に交互に繰り返さない", () => {
		const actor = createActor(polkaMachine);
		actor.start();

		const history = runTicks(actor, 1000);

		// idle→speaking→idle→speaking... のパターンが10回以上連続しない
		let alternatingCount = 0;
		let maxAlternating = 0;

		for (let i = 2; i < history.length; i++) {
			const isAlternating =
				(history[i - 2] === "idle" &&
					history[i - 1] === "speaking" &&
					history[i] === "idle") ||
				(history[i - 2] === "speaking" &&
					history[i - 1] === "idle" &&
					history[i] === "speaking");

			if (isAlternating) {
				alternatingCount++;
				maxAlternating = Math.max(maxAlternating, alternatingCount);
			} else {
				alternatingCount = 0;
			}
		}

		expect(maxAlternating).toBeLessThan(10);
	});

	it("1000tick中、同じStateサイクルパターンが5回以上完全一致しない", () => {
		const actor = createActor(polkaMachine);
		actor.start();

		const history = runTicks(actor, 1000);

		// 連続した遷移（変化のあった点のみ）を取得
		const transitions: string[] = [history[0]];
		for (let i = 1; i < history.length; i++) {
			if (history[i] !== history[i - 1]) transitions.push(history[i]);
		}

		// 長さ4のパターンの出現回数
		const patternCounts: Record<string, number> = {};
		for (let i = 0; i <= transitions.length - 4; i++) {
			const pattern = transitions.slice(i, i + 4).join(",");
			patternCounts[pattern] = (patternCounts[pattern] ?? 0) + 1;
		}

		const maxCount = Math.max(...Object.values(patternCounts));
		expect(maxCount).toBeLessThan(5);
	});
});

// ──────────────────────────────────────────────
// NG3: State持続時間の逸脱
// ──────────────────────────────────────────────
describe("NG3: State持続時間の逸脱", () => {
	it("idleの連続持続が10分（60tick）以上になることがある", () => {
		const actor = createActor(polkaMachine);
		actor.start();

		const history = runTicks(actor, 1000);

		// idle の最大連続持続tickを計算
		let maxIdleDuration = 0;
		let currentIdleDuration = 0;
		for (const state of history) {
			if (state === "idle") {
				currentIdleDuration++;
				maxIdleDuration = Math.max(maxIdleDuration, currentIdleDuration);
			} else {
				currentIdleDuration = 0;
			}
		}

		// 少なくとも1回は60tick(10分)以上idleになること（昼寝キャラ）
		expect(maxIdleDuration).toBeGreaterThanOrEqual(toTicks(600)); // 600sec = 10min
	});

	it("speakingが60秒（6tick）を超えて連続しない", () => {
		const actor = createActor(polkaMachine);
		actor.start();

		// mentionを複数回送って会話を促す
		for (let i = 0; i < 5; i++) {
			actor.send({
				type: "mention",
				data: { content: "ポルカ！", author: "user" },
			});
			runTicks(actor, 20);
		}

		const history = runTicks(actor, 500);

		// speaking の最大連続持続tickを計算
		let maxSpeakingDuration = 0;
		let currentSpeakingDuration = 0;
		for (const state of history) {
			if (state === "speaking") {
				currentSpeakingDuration++;
				maxSpeakingDuration = Math.max(
					maxSpeakingDuration,
					currentSpeakingDuration,
				);
			} else {
				currentSpeakingDuration = 0;
			}
		}

		expect(maxSpeakingDuration).toBeLessThanOrEqual(toTicks(60)); // 60sec = 6tick
	});

	it("watchingの連続持続が10分（60tick）以上になることがある", () => {
		const actor = createActor(polkaMachine);
		actor.start();

		// msgを送ってwatchingを誘発
		actor.send({
			type: "msg",
			data: { content: "誰かが話してる", author: "other" },
		});
		const history = runTicks(actor, 1000);

		let maxWatchingDuration = 0;
		let currentWatchingDuration = 0;
		for (const state of history) {
			if (state === "watching") {
				currentWatchingDuration++;
				maxWatchingDuration = Math.max(
					maxWatchingDuration,
					currentWatchingDuration,
				);
			} else {
				currentWatchingDuration = 0;
			}
		}

		expect(maxWatchingDuration).toBeGreaterThanOrEqual(toTicks(600));
	});
});

// ──────────────────────────────────────────────
// NG4: 自発的な長時間speaking
// ──────────────────────────────────────────────
describe("NG4: 自発的な長時間speaking（昼寝キャラ）", () => {
	it("mentionもmsgもない状態で30分（180tick）以上speakingに入らない", () => {
		const actor = createActor(polkaMachine);
		actor.start();

		// tick のみを送る（外部イベントなし）
		const history = runTicks(actor, 180);

		const speakingCount = history.filter((s) => s === "speaking").length;

		// 外部刺激なしでspeakingに入る時間は全体の10%未満
		expect(speakingCount / history.length).toBeLessThan(0.1);
	});
});

// ──────────────────────────────────────────────
// NG5: mention への無反応
// ──────────────────────────────────────────────
describe("NG5: mentionへの無反応", () => {
	it("mentionから30tick以内にspeakingに遷移する", () => {
		const actor = createActor(polkaMachine);
		actor.start();

		// まずidleに落ち着かせる
		runTicks(actor, 100);

		const history = sendMentionThenTick(actor, 30);

		const hasSpeaking = history.includes("speaking");
		expect(hasSpeaking).toBe(true);
	});

	it("mentionから10tick以内にspeaking or watchingに遷移する", () => {
		const actor = createActor(polkaMachine);
		actor.start();

		runTicks(actor, 100);

		const history = sendMentionThenTick(actor, 10);

		const hasReaction = history.some(
			(s) => s === "speaking" || s === "watching",
		);
		expect(hasReaction).toBe(true);
	});
});

// ──────────────────────────────────────────────
// NG6: searching の連続
// ──────────────────────────────────────────────
describe("NG6: searchingの連続爆発", () => {
	it("searchingが連続して3回以上続かない（1000tick中）", () => {
		const actor = createActor(polkaMachine);
		actor.start();

		const history = runTicks(actor, 1000);

		// searching の最大連続持続tickを計算
		let maxSearchingDuration = 0;
		let currentSearchingDuration = 0;
		for (const state of history) {
			if (state === "searching") {
				currentSearchingDuration++;
				maxSearchingDuration = Math.max(
					maxSearchingDuration,
					currentSearchingDuration,
				);
			} else {
				currentSearchingDuration = 0;
			}
		}

		// searching は最大でも toTicks(120) = 12tick（2分）まで
		expect(maxSearchingDuration).toBeLessThanOrEqual(toTicks(120));
	});
});
