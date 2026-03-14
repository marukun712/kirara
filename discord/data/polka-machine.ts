/**
 * 高橋ポルカ ステートマシン
 *
 * 内部パラメータ：
 *   energy    (0~1) - 活動意欲。低いと眠い。昼寝で回復。
 *   curiosity (0~1) - 好奇心。Discordのメッセージやweb検索で消費・変動。
 *   social    (0~1) - 社交欲。mentionで急上昇。speaking後に下がる。
 *
 * State遷移ルール：
 *   idle      - energy低 or social/curiosity共に低い → じっとしてる（昼寝）
 *   watching  - msg受信 or curiosity中程度 → Discordを眺める
 *   searching - curiosity高 + energy中以上 → Web検索
 *   speaking  - social高 or mention → 発言
 */

import { assign, setup } from "xstate";

// 1tick = 10秒

type PolkaContext = {
	energy: number;
	curiosity: number;
	social: number;
	ticksInState: number;
	// ランダム性のためのシード（固定周期を壊す）
	noisePhase: number;
};

type PolkaEvent =
	| { type: "tick"; data: { timestamp: string } }
	| { type: "msg"; data: { content: string; author: string } }
	| { type: "mention"; data: { content: string; author: string } };

// 0~1にクランプ
const clamp = (v: number) => Math.max(0, Math.min(1, v));

// 擬似ランダム（シード付き）- 固定周期を避けるため
function seededRandom(seed: number): number {
	const x = Math.sin(seed) * 10000;
	return x - Math.floor(x);
}

// ノイズ：小さな揺らぎを加える（固定周期破壊）
function noise(phase: number, scale = 0.03): number {
	return (seededRandom(phase) - 0.5) * 2 * scale;
}

export const polkaMachine = setup({
	types: {
		context: {} as PolkaContext,
		events: {} as PolkaEvent,
	},
}).createMachine({
	id: "polka",
	initial: "idle",
	context: {
		energy: 0.8,
		curiosity: 0.3,
		social: 0.2,
		ticksInState: 0,
		noisePhase: 42,
	},

	states: {
		// ────────── idle（昼寝・ぼーっと） ──────────
		idle: {
			on: {
				tick: [
					// mention がきたら即 speaking へ（後述の mention ハンドラで対応）
					{
						// energy十分 + social高 → speaking（最低60tick=10分はidleに居る）
						guard: ({ context }) =>
							context.social >= 0.65 &&
							context.energy >= 0.4 &&
							context.ticksInState >= 60,
						target: "speaking",
						actions: assign(({ context }) => ({
							ticksInState: 0,
							noisePhase: context.noisePhase + 1,
						})),
					},
					{
						// energy十分 + curiosity高 → searching
						guard: ({ context }) =>
							context.curiosity >= 0.7 &&
							context.energy >= 0.5 &&
							context.ticksInState >= 60,
						target: "searching",
						actions: assign(({ context }) => ({
							ticksInState: 0,
							noisePhase: context.noisePhase + 1,
						})),
					},
					{
						// energy十分 + curiosity中 → watching
						guard: ({ context }) =>
							context.curiosity >= 0.45 &&
							context.energy >= 0.35 &&
							context.ticksInState >= 60,
						target: "watching",
						actions: assign(({ context }) => ({
							ticksInState: 0,
							noisePhase: context.noisePhase + 1,
						})),
					},
					{
						// そのまま idle に留まる（パラメータ更新のみ）
						actions: assign(({ context }) => {
							const n = noise(context.noisePhase);
							return {
								// 昼寝でエネルギー回復
								energy: clamp(
									context.energy +
										0.012 +
										noise(context.noisePhase + 0.1, 0.005),
								),
								// idle中はcuriosityがゆっくり増える（暇になる）
								curiosity: clamp(context.curiosity + 0.008 + n),
								// socialはゆっくり低下（誰とも話してない）
								social: clamp(
									context.social -
										0.005 +
										noise(context.noisePhase + 0.2, 0.003),
								),
								ticksInState: context.ticksInState + 1,
								// 黄金比に近い値で更新し、周期性を壊す
								noisePhase: context.noisePhase + 1.6180339887,
							};
						}),
					},
				],
				msg: {
					// Discordに動きがあったらcuriosity上昇
					actions: assign(({ context }) => ({
						curiosity: clamp(
							context.curiosity + 0.12 + noise(context.noisePhase, 0.04),
						),
						noisePhase: context.noisePhase + Math.E,
					})),
				},
				mention: {
					// メンションされたら即 speaking へ
					target: "speaking",
					actions: assign(({ context }) => ({
						social: clamp(context.social + 0.4),
						energy: clamp(context.energy + 0.05),
						ticksInState: 0,
						noisePhase: context.noisePhase + 3.1,
					})),
				},
			},
		},

		// ────────── watching（Discord眺め） ──────────
		watching: {
			on: {
				tick: [
					{
						// social高 → speaking
						guard: ({ context }) =>
							context.social >= 0.6 && context.ticksInState >= 3,
						target: "speaking",
						actions: assign(({ context }) => ({
							ticksInState: 0,
							noisePhase: context.noisePhase + 1,
						})),
					},
					{
						// curiosity上昇 → searching
						guard: ({ context }) =>
							context.curiosity >= 0.75 &&
							context.energy >= 0.45 &&
							context.ticksInState >= 3,
						target: "searching",
						actions: assign(({ context }) => ({
							ticksInState: 0,
							noisePhase: context.noisePhase + 1,
						})),
					},
					{
						// energy枯渇 or curiosity消えた → idle（最低60tick=600秒=10分は居る）
						guard: ({ context }) =>
							(context.energy <= 0.25 || context.curiosity <= 0.15) &&
							context.ticksInState >= 60,
						target: "idle",
						actions: assign(({ context }) => ({
							ticksInState: 0,
							noisePhase: context.noisePhase + 1,
						})),
					},
					{
						// watching継続（パラメータ更新）
						actions: assign(({ context }) => {
							const n = noise(context.noisePhase);
							return {
								// 眺めているとcuriosityが消費される
								curiosity: clamp(context.curiosity - 0.006 + n),
								// energyもゆっくり消費
								energy: clamp(
									context.energy -
										0.004 +
										noise(context.noisePhase + 0.5, 0.003),
								),
								// 誰かが話してるのを見ていると少しsocial上昇
								social: clamp(
									context.social + 0.004 + noise(context.noisePhase + 1, 0.003),
								),
								ticksInState: context.ticksInState + 1,
								noisePhase: context.noisePhase + 1.6180339887,
							};
						}),
					},
				],
				msg: {
					// メッセージが増えるとcuriosity/social上昇
					actions: assign(({ context }) => ({
						curiosity: clamp(
							context.curiosity + 0.08 + noise(context.noisePhase, 0.03),
						),
						social: clamp(
							context.social + 0.05 + noise(context.noisePhase + 1, 0.02),
						),
						noisePhase: context.noisePhase + 1.9,
					})),
				},
				mention: {
					target: "speaking",
					actions: assign(({ context }) => ({
						social: clamp(context.social + 0.4),
						ticksInState: 0,
						noisePhase: context.noisePhase + 3.1,
					})),
				},
			},
		},

		// ────────── searching（Web検索） ──────────
		searching: {
			on: {
				tick: [
					{
						// social高 → speaking（検索結果を話したくなる）
						guard: ({ context }) =>
							context.social >= 0.55 && context.ticksInState >= 2,
						target: "speaking",
						actions: assign(({ context }) => ({
							ticksInState: 0,
							noisePhase: context.noisePhase + 1,
						})),
					},
					{
						// curiosity消費 or energy枯渇 → watching or idle
						// searching は最大11tick（110秒＝約2分）
						guard: ({ context }) =>
							context.curiosity <= 0.2 ||
							context.energy <= 0.3 ||
							context.ticksInState >= 11,
						target: "watching",
						actions: assign(({ context }) => ({
							ticksInState: 0,
							noisePhase: context.noisePhase + 1,
						})),
					},
					{
						// searching継続
						actions: assign(({ context }) => {
							const n = noise(context.noisePhase);
							return {
								// 検索でcuriosity急速消費
								curiosity: clamp(context.curiosity - 0.05 + n),
								// エネルギーも消費
								energy: clamp(
									context.energy -
										0.008 +
										noise(context.noisePhase + 0.5, 0.004),
								),
								// 検索結果が面白いとsocial上昇することも
								social: clamp(
									context.social + 0.02 + noise(context.noisePhase + 2, 0.015),
								),
								ticksInState: context.ticksInState + 1,
								noisePhase: context.noisePhase + 2.6457513111,
							};
						}),
					},
				],
				msg: {
					actions: assign(({ context }) => ({
						social: clamp(context.social + 0.07),
						noisePhase: context.noisePhase + 1.1,
					})),
				},
				mention: {
					target: "speaking",
					actions: assign(({ context }) => ({
						social: clamp(context.social + 0.4),
						ticksInState: 0,
						noisePhase: context.noisePhase + 3.1,
					})),
				},
			},
		},

		// ────────── speaking（発言） ──────────
		speaking: {
			on: {
				tick: [
					{
						// social消費しきった or energy低い → idle or watching
						// speaking は最大6tick（60秒）
						guard: ({ context }) =>
							context.social <= 0.15 ||
							context.energy <= 0.2 ||
							context.ticksInState >= 6,
						// energyが高ければwatchingへ、低ければidleへ
						target: "idle",
						actions: assign(({ context }) => ({
							ticksInState: 0,
							noisePhase: context.noisePhase + 1,
						})),
					},
					{
						// speaking継続
						actions: assign(({ context }) => {
							const n = noise(context.noisePhase);
							return {
								// 喋るとsocial急速消費
								social: clamp(context.social - 0.12 + n),
								// energyも消費
								energy: clamp(
									context.energy -
										0.015 +
										noise(context.noisePhase + 0.5, 0.005),
								),
								// 喋ったらcuriosityも少し下がる（スッキリ）
								curiosity: clamp(
									context.curiosity -
										0.03 +
										noise(context.noisePhase + 1, 0.01),
								),
								ticksInState: context.ticksInState + 1,
								noisePhase: context.noisePhase + 1.7320508076,
							};
						}),
					},
				],
				msg: {
					actions: assign(({ context }) => ({
						social: clamp(context.social + 0.1),
						noisePhase: context.noisePhase + 2.2360679775,
					})),
				},
				mention: {
					// speaking中にmentionされたらsocial補充（会話継続）
					actions: assign(({ context }) => ({
						social: clamp(context.social + 0.35),
						ticksInState: 0, // タイマーリセット
						noisePhase: context.noisePhase + 3.1,
					})),
				},
			},
		},
	},
});
