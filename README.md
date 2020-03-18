# Netlify Ghost Markdown Build Plugin

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
  ghostURL = "https://YOURGHOST.URL"
  ghostKey = "YOURGHOSTKEY"

  # Optionally set a directory for images
  assetsDir = "./assets/images/"

  # Optionally set a directory for pages
  pagesDir = "./"

  # Optionally set a directory for posts
  postsDir = "./_posts/"

  # Optionally remove the date prefix from post filenames
  postDatePrefix = true
```

Currently posts follow the [Jekyll markdown file name format](https://jekyllrb.com/docs/posts/#creating-posts). Set the `postDatePrefix` to false to use the post slug as the file name

## Development

1. Create a testing project using a static site generator like Jekyll:
   ```
   gem install bundler jekyll
   jekyll new my-awesome-site
   ```
1. Move into that project, `cd my-awesome-site`

1. Clone this repo into a `_plugins` directory using the following:

   ```
   git clone git@github.com:daviddarnes/netlify-plugin-ghost-markdown.git _netlify-plugin-ghost-markdown
   ```

1. Move into the plugin directory, `cd _plugins`

1. Run `npm install`

1. Create a new `netlify.toml` file with the following:

   ```toml
   [[plugins]]
   package = "_netlify-plugin-ghost-markdown"

     [plugins.config]
     ghostURL = "https://YOURGHOST.URL"
     ghostKey = "YOURGHOSTKEY"
     # Remember to get your Ghost API credentials
   ```

1. Run `netlify build`

# License

Released under the [MIT license](LICENSE).
