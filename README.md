# netlify-plugin-ghost-markdown

Returns Ghost content as markdown files for static site generators like Jekyll to consume.

The plugin will:
- Pull down posts as markdown files with front matter
- Pull down pages as markdown files with front matter
- Download any images that are relative to the Ghost site



## Installation

Add the following to your `netlify.yaml` file:

``` yaml
plugins:
  - package: "netlify-plugin-ghost-markdown"
    config:
      ghostURL: "https://YOURGHOST.URL"
      ghostKey: "YOURGHOSTKEY"
```

_Test credentials can be "borrowed" from here: https://ghost.org/docs/api/v3/javascript/content/#working-example_

## Options
``` yaml
# Where the images will go
assetsDir: "./assets/images/"

# Where the pages will go
pagesDir: "./"

# Where the posts will go
postsDir: "./_posts/"
```

Currently posts follow the Jekyll markdown file name format. Will allow for customisation in future.
