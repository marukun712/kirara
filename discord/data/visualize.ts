/**
 * ポルカ 1000tick シミュレーション & SVGビジュアライゼーション
 * 実行: bun run data/visualize.ts
 */

import { writeFileSync } from "node:fs";
import { createActor } from "xstate";
import { polkaMachine } from "./polka-machine";

const TICKS = 1000;
const TICK_SEC = 10;

type StateRecord = {
	tick: number;
	state: string;
	energy: number;
	curiosity: number;
	social: number;
};

// ── シミュレーション ──────────────────────────────
const actor = createActor(polkaMachine);
actor.start();

const records: StateRecord[] = [];

// 適度なイベントを挿入（リアルなDiscord環境を模倣）
const msgTicks = new Set<number>();
const mentionTicks = new Set<number>();

// msgは100tick中 10〜15回くらい（普通のDiscord）
for (let i = 0; i < TICKS; i++) {
	if (Math.sin(i * 0.37 + 1.2) > 0.75) msgTicks.add(i);
}
// mentionは全体で5〜8回
[150, 280, 420, 610, 750, 890].forEach((t) => mentionTicks.add(t));

for (let i = 0; i < TICKS; i++) {
	if (mentionTicks.has(i)) {
		actor.send({
			type: "mention",
			data: { content: "ポルカ！", author: "user" },
		});
	} else if (msgTicks.has(i)) {
		actor.send({
			type: "msg",
			data: { content: "メッセージ", author: "someone" },
		});
	}

	actor.send({
		type: "tick",
		data: { timestamp: new Date(i * TICK_SEC * 1000).toISOString() },
	});

	const snap = actor.getSnapshot();
	records.push({
		tick: i,
		state: snap.value as string,
		energy: snap.context.energy,
		curiosity: snap.context.curiosity,
		social: snap.context.social,
	});
}

// ── 統計 ──────────────────────────────────────────
const stateCounts: Record<string, number> = {};
for (const r of records) {
	stateCounts[r.state] = (stateCounts[r.state] ?? 0) + 1;
}

console.log("=== 状態分布 ===");
for (const [state, count] of Object.entries(stateCounts).sort(
	(a, b) => b[1] - a[1],
)) {
	const pct = ((count / TICKS) * 100).toFixed(1);
	const bar = "█".repeat(Math.round(count / 20));
	console.log(
		`${state.padEnd(12)} ${count.toString().padStart(4)}tick (${pct}%) ${bar}`,
	);
}

// 遷移回数
let transitions = 0;
for (let i = 1; i < records.length; i++) {
	if (records[i].state !== records[i - 1].state) transitions++;
}
console.log(
	`\n遷移回数: ${transitions} (${(transitions / TICKS).toFixed(3)} /tick)`,
);

// ── SVG生成 ───────────────────────────────────────
const W = 1200;
const LANE_H = 28;
const PARAM_H = 80;
const LEGEND_H = 40;
const STATES = ["idle", "watching", "searching", "speaking"];
const STATE_COLORS: Record<string, string> = {
	idle: "#7ea8d4",
	watching: "#7ed47e",
	searching: "#d4c47e",
	speaking: "#d47e7e",
};
const PARAM_COLORS = {
	energy: "#4a90d9",
	curiosity: "#e8a838",
	social: "#e85c8a",
};

const totalH = STATES.length * LANE_H + PARAM_H + LEGEND_H + 60;

let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${totalH}" style="font-family:monospace;background:#1a1a2e">`;

// タイトル
svg += `<text x="${W / 2}" y="22" text-anchor="middle" fill="#e0e0e0" font-size="14" font-weight="bold">高橋ポルカ 1000tick シミュレーション（1tick=10秒）</text>`;

const chartX = 80;
const chartW = W - chartX - 20;

// ── Stateレーン ──
STATES.forEach((state, si) => {
	const y = 35 + si * LANE_H;

	// ラベル
	svg += `<text x="${chartX - 5}" y="${y + LANE_H / 2 + 4}" text-anchor="end" fill="${STATE_COLORS[state]}" font-size="11">${state}</text>`;

	// 背景
	svg += `<rect x="${chartX}" y="${y}" width="${chartW}" height="${LANE_H - 2}" fill="#111122" rx="2"/>`;

	// tick ブロック
	for (let i = 0; i < TICKS; i++) {
		if (records[i].state === state) {
			const x = chartX + (i / TICKS) * chartW;
			const w = Math.max(1, chartW / TICKS);
			svg += `<rect x="${x.toFixed(1)}" y="${y + 2}" width="${w.toFixed(1)}" height="${LANE_H - 6}" fill="${STATE_COLORS[state]}" opacity="0.85"/>`;
		}
	}

	// mention マーカー
	for (const mt of mentionTicks) {
		const x = chartX + (mt / TICKS) * chartW;
		if (si === 0) {
			svg += `<line x1="${x.toFixed(1)}" y1="35" x2="${x.toFixed(1)}" y2="${35 + STATES.length * LANE_H}" stroke="#ff6b9d" stroke-width="1" opacity="0.6" stroke-dasharray="3,3"/>`;
		}
	}
});

// ── パラメータグラフ ──
const paramY = 35 + STATES.length * LANE_H + 15;
svg += `<text x="${chartX - 5}" y="${paramY - 5}" text-anchor="end" fill="#aaa" font-size="10">params</text>`;
svg += `<rect x="${chartX}" y="${paramY}" width="${chartW}" height="${PARAM_H}" fill="#111122" rx="2"/>`;

// グリッドライン
[0.25, 0.5, 0.75].forEach((v) => {
	const y = paramY + PARAM_H * (1 - v);
	svg += `<line x1="${chartX}" y1="${y.toFixed(1)}" x2="${chartX + chartW}" y2="${y.toFixed(1)}" stroke="#333" stroke-width="0.5"/>`;
	svg += `<text x="${chartX - 3}" y="${(y + 3).toFixed(1)}" text-anchor="end" fill="#555" font-size="9">${v}</text>`;
});

// パラメータ折れ線
(["energy", "curiosity", "social"] as const).forEach((param) => {
	const points = records
		.map((r, i) => {
			const x = chartX + (i / TICKS) * chartW;
			const y = paramY + PARAM_H * (1 - r[param]);
			return `${x.toFixed(1)},${y.toFixed(1)}`;
		})
		.join(" ");
	svg += `<polyline points="${points}" fill="none" stroke="${PARAM_COLORS[param]}" stroke-width="1" opacity="0.8"/>`;
});

// ── 凡例 ──
const legendY = paramY + PARAM_H + 15;
let lx = chartX;

STATES.forEach((state) => {
	const pct = (((stateCounts[state] ?? 0) / TICKS) * 100).toFixed(1);
	svg += `<rect x="${lx}" y="${legendY}" width="14" height="14" fill="${STATE_COLORS[state]}" rx="2"/>`;
	svg += `<text x="${lx + 18}" y="${legendY + 11}" fill="#ccc" font-size="11">${state} ${pct}%</text>`;
	lx += 120;
});

lx += 20;
(["energy", "curiosity", "social"] as const).forEach((p) => {
	svg += `<rect x="${lx}" y="${legendY}" width="14" height="14" fill="${PARAM_COLORS[p]}" rx="2"/>`;
	svg += `<text x="${lx + 18}" y="${legendY + 11}" fill="#ccc" font-size="11">${p}</text>`;
	lx += 90;
});

// tick軸ラベル
[0, 250, 500, 750, 1000].forEach((t) => {
	const x = chartX + (t / TICKS) * chartW;
	const timeMin = Math.floor((t * TICK_SEC) / 60);
	svg += `<text x="${x.toFixed(1)}" y="${legendY + 30}" text-anchor="middle" fill="#666" font-size="9">${t}t (${timeMin}m)</text>`;
});

svg += "</svg>";

const outPath = "./data/polka-simulation.svg";
writeFileSync(outPath, svg);
console.log(`\nSVG saved: ${outPath}`);
