// A small CRA 5 configuration adapter; no changes to installed dependencies.
process.env.BABEL_ENV = "development";
process.env.NODE_ENV = "development";
require("react-scripts/config/env");
const configureUploads = require("./devServerConfig.cjs");
const configPath = require.resolve("react-scripts/config/webpackDevServer.config");
const createConfig = require(configPath);
require.cache[configPath].exports = (...args) => configureUploads(createConfig(...args));
require("react-scripts/scripts/start");
