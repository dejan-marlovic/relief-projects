const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const configureUploads = require("./devServerConfig.cjs");

test("upload changes are ignored while normal public files and existing exclusions retain their behaviour", () => {
  const oldIgnore = /node_modules/;
  const directory = path.resolve("public");
  const config = configureUploads({ static: { directory, watch: { ignored: oldIgnore, usePolling: true } } });
  const watch = config.static.watch;
  const ignored = name => watch.ignored.some(pattern => pattern.test(path.resolve(directory, name).replace(/\\/g, "/")));
  assert.equal(ignored("images/projects/new-picture.jpg"), true);
  assert.equal(ignored("images/projects"), true);
  assert.equal(ignored("images/projects-other/logo.png"), false);
  assert.equal(ignored("index.html"), false);
  assert.equal(ignored("favicon.ico"), false);
  assert.equal(watch.ignored[0], oldIgnore);
  assert.equal(watch.usePolling, true);
  assert.equal(config.static.directory, directory);
});

test("works with the installed CRA configuration without changing static serving or source hot reload", () => {
  process.env.NODE_ENV = "development";
  const original = require("react-scripts/config/webpackDevServer.config")(undefined, "localhost");
  const directory = original.static.directory;
  const hot = original.hot;
  const config = configureUploads(original);
  assert.equal(config.static.directory, directory);
  assert.equal(config.hot, hot);
  assert.equal(config.static.watch.ignored.length, 2);
});
