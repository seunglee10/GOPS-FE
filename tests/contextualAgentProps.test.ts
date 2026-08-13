import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const newsPanelSource = readFileSync(fileURLToPath(new URL("../src/news/NewsPanel.tsx", import.meta.url)), "utf-8");
const watchlistNewsPanelSource = readFileSync(fileURLToPath(new URL("../src/news/WatchlistNewsPanel.tsx", import.meta.url)), "utf-8");
const chartPanelSource = readFileSync(fileURLToPath(new URL("../src/chart/ChartPanel.tsx", import.meta.url)), "utf-8");

assert.match(newsPanelSource, /onAgentAsk\?: \(\) => void/);
assert.match(watchlistNewsPanelSource, /onAgentAsk\?: \(\) => void/);
assert.match(chartPanelSource, /onAgentAsk\?: \(\) => void/);
