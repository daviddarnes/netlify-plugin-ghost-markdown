# Netlify Ghost Markdown Build Plugin

![npm version badge](https://img.shields.io/npm/v/netlify-plugin-ghost-markdown)

This plugin generates posts and pages from a [Ghost](https://ghost.org) publication as markdown files, using the [Ghost Content API](https://ghost.org/docs/api/v3/content/). In addition it will copy images from the Ghost publication into a local assets directory. Pages, posts and images will be generated on the `onPreBuild` event in the Netlify deployment cycle, this is to ensure the files are present before an actual build occurs.

## Prerequisites

Before you can use this package you'll need a Netlify project that can consume markdown files and images. This package was built with [Jekyll](https://jekyllrb.com) in mind, however in theory it should work with any static site generator :sparkles:. Additionally you'll need the [Netlify CLI tool](https://github.com/netlify/cli#netlify-cli) installed and [Build Plugins Beta enabled](https://docs.netlify.com/configure-builds/plugins).

## Installation

To install, add the following lines to your `netlify.toml` file:

```toml
[[plugins]]
package = "netlify-plugin-ghost-markdown"

   [plugins.inputs]
   ghostURL = "https://YOURGHOST.URL"
   ghostKey = "YOURGHOSTKEY"
```

Note: The `[[plugins]]` line is required for each plugin, even if you have other plugins in your `netlify.toml` file already.

You'll need to get a Ghost Content API URL and key to authenticate with your Ghost publication. Please see [the Ghost documentation](https://ghost.org/docs/api/v3/javascript/content/#authentication) for more info.

_Psst, test credentials can be "borrowed" from here: https://ghost.org/docs/api/v3/javascript/content/#working-example_

## Configuration

```toml
[[plugins]]
package = "netlify-plugin-ghost-markdown"

  [plugins.inputs]
  # Required: Your Ghost domain, must not end in a trailing slash
  ghostURL = "https://YOURGHOST.URL"

  # Required: Content API key from the Integrations screen in Ghost Admin
  ghostKey = "YOURGHOSTKEY"

  # Optional: Directory containing image assets (assets/images by default)
  assetsDir = "./assets/images/"

  # Optional: Directory containing pages (site root by default)
  pagesDir = "./"

  # Optional: Directory containing posts (_posts/ directory by default)
  postsDir = "./_posts/"

  # Optional: Layout value for pages (page by default)
  pageLayout = "page"

  # Optional: Layout value for posts (post by default)
  postsLayout = "post"

  # Optional: Date prefix on post file names (true by default)
  postDatePrefix = true

  # Optional: File path and name for a timestamp caching file (_data/ghostMarkdownCache.json by default)
  cacheFile = "./_data/ghostMarkdownCache.json"
```

Currently posts follow the [Jekyll markdown file name format](https://jekyllrb.com/docs/posts/#creating-posts). Set the `postDatePrefix` to false to use the post slug as the file name

## Development

_Testing inside the project is proving difficult at the minute. [Currently requesting support on a practical method here](https://community.netlify.com/t/creating-demos-for-build-plugins/12774/8)_

1. Clone project down

2. Install dependencies with `npm install`

3. Run `npm run test` to clone the plugin into `test/` Jekyll project

# License

Released under the [MIT license](LICENSE).
