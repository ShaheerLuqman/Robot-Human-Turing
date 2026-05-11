const fs = require("fs");
const path = require("path");

const base = path.join(__dirname, "..", "public", "videos");
const videos = [];

function walk(dir, parts) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, [...parts, entry.name]);
    } else if (entry.isFile() && entry.name.endsWith(".mp4")) {
      const rel = full.replace(base, "").split(path.sep).join("/");
      const topFolder = parts[0];
      let label, method, environment;
      if (topFolder === "Human") {
        label = "human";
        method = "human";
        environment = parts[1];
      } else {
        label = "robot";
        method = `${topFolder}_${parts[1]}`;
        environment = parts[2];
      }
      const id =
        "vid" +
        rel
          .replace(/\.mp4$/, "")
          .replace(/[^a-zA-Z0-9]/g, "_")
          .replace(/_+/g, "_");
      videos.push({ id, url: "/videos" + rel, label, method, environment });
    }
  }
}

walk(base, []);

const outPath = path.join(__dirname, "..", "lib", "videos.json");
fs.writeFileSync(outPath, JSON.stringify(videos, null, 2));
console.log(`Written ${videos.length} entries to lib/videos.json`);
