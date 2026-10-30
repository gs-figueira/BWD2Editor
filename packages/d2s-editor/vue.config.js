// const Dotenv = require('dotenv-webpack')

module.exports = {
  // BW: build output is not versioned (it embeds game data from public/)
  outputDir : './dist',
  // BW: relative paths so the build works under any sub-path (GitHub Pages serves /<repo>/)
  publicPath: './',
  // configureWebpack: {
  //   devServer: {
  //     historyApiFallback: false, // Error URL doesn't redirect to index app page, creating errors if globals from index.html are missing
  //   },
  //   devtool: 'source-map',
  //   plugins: [new Dotenv()],
  // },
}
