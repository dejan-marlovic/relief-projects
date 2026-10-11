const path = require("path");

// Uploaded project pictures are runtime data, not source edits. Keep serving
// them, but do not let their creation/deletion reload a page with active edits.
module.exports = function configureUploads(config) {
  const entries = Array.isArray(config.static) ? config.static : [config.static];
  for (const entry of entries) {
    if (!entry || !entry.directory || entry.watch === false) continue;
    const uploadDirectory = path.resolve(entry.directory, "images/projects").replace(/\\/g, "/");
    const escaped = uploadDirectory.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const ignored = entry.watch?.ignored;
    entry.watch = {
      ...(typeof entry.watch === "object" ? entry.watch : {}),
      ignored: [...(Array.isArray(ignored) ? ignored : ignored ? [ignored] : []), new RegExp(`^${escaped}(?:/|$)`)],
    };
  }
  return config;
};
