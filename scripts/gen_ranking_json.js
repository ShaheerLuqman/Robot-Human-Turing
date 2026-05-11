const fs = require("fs");
const path = require("path");

const videos = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "lib", "videos.json"), "utf8"));

const METHODS = ["human", "MAQ+SAC", "MAQ+RLPD", "MAQ+IQL", "HiMAQ+SAC", "HiMAQ+RLPD", "HiMAQ+IQL"];
const METHOD_MAP = {
  "human":       "human",
  "MAQ+SAC":     "MAQ_SAC",
  "MAQ+RLPD":    "MAQ_RLPD",
  "MAQ+IQL":     "MAQ_IQL",
  "HiMAQ+SAC":   "HiMAQ_SAC",
  "HiMAQ+RLPD":  "HiMAQ_RLPD",
  "HiMAQ+IQL":   "HiMAQ_IQL",
};
const ENVIRONMENTS = ["door", "hammer", "pen", "relocate"];

// Index 1.mp4 videos by method+environment
const index = new Map();
for (const v of videos) {
  if (!v.url.endsWith("/1.mp4")) continue;
  const key = `${v.method}::${v.environment}`;
  index.set(key, v);
}

function pick(methodLabel, environment) {
  const key = `${METHOD_MAP[methodLabel]}::${environment}`;
  const v = index.get(key);
  if (!v) throw new Error(`No 1.mp4 for method=${methodLabel} env=${environment}`);
  return v;
}

const trials = [];
let trialIndex = 1;

for (let i = 0; i < METHODS.length; i++) {
  for (let j = i + 1; j < METHODS.length; j++) {
    // Pick a consistent environment per pair using index sum mod 4
    const environment = ENVIRONMENTS[(i + j) % ENVIRONMENTS.length];
    const videoA = pick(METHODS[i], environment);
    const videoB = pick(METHODS[j], environment);

    trials.push({
      id: `rank_${String(trialIndex).padStart(3, "0")}`,
      environment,
      video_a: { id: videoA.id, url: videoA.url, method: METHODS[i], label: videoA.label },
      video_b: { id: videoB.id, url: videoB.url, method: METHODS[j], label: videoB.label },
    });
    trialIndex++;
  }
}

const outPath = path.join(__dirname, "..", "lib", "ranking.json");
fs.writeFileSync(outPath, JSON.stringify(trials, null, 2));
console.log(`Written ${trials.length} trials to lib/ranking.json`);
