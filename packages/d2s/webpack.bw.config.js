// BW: browser bundle of d2s only (constants come from packages/bw-data, not src/data/versions)
module.exports = {
  mode: "production",
  entry: { d2s: "./src/index.ts" },
  output: { path: __dirname + "/dist", filename: "[name].bundle.min.js", library: "[name]" },
  resolve: { extensions: [".ts", ".tsx", ".js"] },
  module: { rules: [{ test: /\.tsx?$/, loader: "ts-loader" }] },
};
