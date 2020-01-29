# Netlify Ghost Markdown Build Plugin

This plugin generates posts and pages from a [Ghost](https://ghost.org) publication as markdown files, using the [Ghost Content API](https://ghost.org/docs/api/v3/content/). In addition it will copy images from the Ghost publication into a local assets directory. Pages, posts and images will be generated on the `onPreBuild` event in the Netlify deployment cycle, this is to ensure the files are present before an actual build occurs.

## Prerequisits

Before you can use this package you'll need a Netlify project that can consume markdown files and images. This package was built with [Jekyll](https://jekyllrb.com) in mind, however in theory it should work with any static site generator :sparkles:. Additionally you'll need the [Netlify CLI tool](https://github.com/netlify/cli#netlify-cli) installed and [build plugins enabled](https://www.netlify.com/build/plugins-beta/).

## Installation

1. Install the package as a dev dependency:
   ```
   npm install --save-dev netlify-plugin-ghost-markdown
   ```

1. Add the following to your `netlify.yaml` file:
   ``` yaml
     - package: "netlify-plugin-ghost-markdown"
       config:
         ghostURL: "https://YOURGHOST.URL"
         ghostKey: "YOURGHOSTKEY"
   ```

You'll need to get a Ghost Content API URL and key to authenticate with your Ghost publication. Please see [the Ghost documentation](https://ghost.org/docs/api/v3/javascript/content/#authentication) for more info.

_Psst, test credentials can be "borrowed" from here: https://ghost.org/docs/api/v3/javascript/content/#working-example_

## Configuration
``` yaml
  - package: "netlify-plugin-ghost-markdown"
    config:
      ghostURL: "https://YOURGHOST.URL"
      ghostKey: "YOURGHOSTKEY"
      
      # Optionally set a directory for images
      assetsDir: "./assets/images/"
      
      # Optionally set a directory for pages
      pagesDir: "./"
      
      # Optionally set a directory for posts
      postsDir: "./_posts/"
```

Currently posts follow the [Jekyll markdown file name format](https://jekyllrb.com/docs/posts/#creating-posts). The option to pass template strings in as an option will come in the near future.

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

1. Create a new `netlify.yaml` file with the following:
   ```
   - package: "_netlify-plugin-ghost-markdown"
     config:
       ghostURL: "https://YOURGHOST.URL"
       ghostKey: "YOURGHOSTKEY"
       # Remember to get your Ghost API credentials
   ```

1. Run `netlify build`
