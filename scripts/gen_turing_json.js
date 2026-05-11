const fs = require("fs");
const path = require("path");

const videos = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "lib", "videos.json"), "utf8"));

const HIMAQ_METHODS = ["HiMAQ+SAC", "HiMAQ+RLPD", "HiMAQ+IQL"];
const METHOD_MAP = {
  "HiMAQ+SAC":  "HiMAQ_SAC",
  "HiMAQ+RLPD": "HiMAQ_RLPD",
  "HiMAQ+IQL":  "HiMAQ_IQL",
};
const ENVIRONMENTS = ["door", "hammer", "pen", "relocate"];

// Index videos by method+environment
const index = new Map();
for (const v of videos) {
  const key = `${v.method}::${v.environment}`;
  if (!index.has(key)) index.set(key, []);
  index.get(key).push(v);
}

// Only use 1.mp4 files
function pickFirst(method, environment) {
  const key = `${method}::${environment}`;
  const pool = index.get(key);
  if (!pool || !pool.length) throw new Error(`No video for method=${method} env=${environment}`);
  const one = pool.find(v => v.url.endsWith("/1.mp4"));
  if (!one) throw new Error(`No 1.mp4 for method=${method} env=${environment}`);
  return one;
}

const trials = [];
let trialIndex = 1;

for (const environment of ENVIRONMENTS) {
  for (const himaqLabel of HIMAQ_METHODS) {
    const humanVideo = pickFirst("human", environment);
    const robotVideo = pickFirst(METHOD_MAP[himaqLabel], environment);

    trials.push({
      id: `trial_${String(trialIndex).padStart(3, "0")}`,
      environment,
      video_a: { id: humanVideo.id, url: humanVideo.url, method: "human", label: humanVideo.label },
      video_b: { id: robotVideo.id, url: robotVideo.url, method: himaqLabel, label: robotVideo.label },
    });
    trialIndex++;
  }
}

const outPath = path.join(__dirname, "..", "lib", "turing.json");
fs.writeFileSync(outPath, JSON.stringify(trials, null, 2));
console.log(`Written ${trials.length} trials to lib/turing.json`);
