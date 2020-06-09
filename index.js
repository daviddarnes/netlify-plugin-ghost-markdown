const fs = require("fs-extra");
const path = require("path");
const fetch = require("node-fetch");
const url = require("url");
const { cyan, green, yellow } = require("chalk");
const ghostContentAPI = require("@tryghost/content-api");

const log = ({ color, label, value = false }) => {
  // log({
  // color = chalk color
  // label = string, text label
  // value = var, value being read out
  // });
  console.log(`${color(label)}${value ? color(`: ${color.bold(value)}`) : ""}`);
};

const getContent = async ({ contentType, failPlugin }) => {
  // getContent({
  // contentType = api.posts || api.pages
  // failPlugin = failPlugin
  // });

  try {
    // Retrieve the content using the set API endpoint
    const content = await contentType.browse({
      include: "tags,authors",
      limit: "all"
    });

    // Return content
    return content;
  } catch {
    failPlugin("Ghost API content error", { error });
  }
};

const downloadImage = async ({ imagePath, outputPath, failPlugin }) => {
  // downloadImage({
  // imagePath = string, image path
  // outputPath = string, desired relative image path
  // failPlugin = failPlugin
  // });

  try {
    // Grab file data from remote path
    const response = await fetch(imagePath);
    const fileData = await response.buffer();

    // Write the file and cache it
    await fs.outputFile(outputPath, fileData);
  } catch (error) {
    failPlugin("Image download error", { error });
  }
};

const getRelativeImagePath = ({ imagePath, contentPath }) => {
  // getRelativeImagePath({
  // imagePath = string, the path of the image
  // contentPath = string, the path of the post or page
  // });

  // Split both paths into arrays, at their directory points
  const explodedImagePath = imagePath.split("/");
  const explodedContentPath = contentPath.split("/");

  // Find the point at which the image path diverges from the content path
  const difference = explodedImagePath.findIndex((slice, index) => {
    return explodedContentPath[index] != slice;
  });

  // Reconstruct the image path from the point it diverges to it's end
  const relativePath = `/${explodedImagePath.slice(difference).join("/")}`;

  // Return the new image path
  return relativePath;
};

const createMarkdownContent = ({ content, imagesPath, assetsDir, layout }) => {
  // createMarkdownContent({
  // content = object, the content item
  // imagesPath = string, the base path for Ghost images
  // assetsPath = string, the new path for images
  // layout = string, the layout name
  // });

  // Replace Ghost image paths with the new image paths
  const formatImagePaths = string => {
    return string.replace(new RegExp(imagesPath, "g"), assetsDir);
  };

  // Format tags into a comma separated string
  const formatTags = tags => {
    if (tags) {
      return `[${tags.map(tag => tag.name).join(", ")}]`;
    }
    return "";
  };

  // Remove indentation
  const dedent = string => {
    string = string.replace(/^\n/, "");
    let match = string.match(/^\s+/);
    return match
      ? string.replace(new RegExp("^" + match[0], "gm"), "")
      : string;
  };

  // Create the markdown template
  const template = `
    ---
    date: ${content.published_at.slice(0, 10)}
    title: "${content.title}"
    layout: ${layout}
    excerpt: "${content.custom_excerpt ? content.custom_excerpt : ""}"
    image: "${
      content.feature_image ? formatImagePaths(content.feature_image) : ""
    }"
    tags: ${formatTags(content.tags)}
    ---
    ${formatImagePaths(content.html)}
  `;

  // Return the template without the indentation
  return dedent(template);
};

const writeFile = async ({ fullFilePath, content, failPlugin }) => {
  // writeFile({
  // fullFilePath = string, the full file path and name with extension
  // failPlugin = failPlugin
  //});

  try {
    // Output file using path and name with it's content within
    await fs.outputFile(fullFilePath, content);
  } catch (error) {
    failPlugin(`Error writing ${fullFilePath}`, { error });
  }
};

const getCacheTimestamp = async ({ cache, fullFilePath, failPlugin }) => {
  // getCacheTimestamp({
  // cache = cache
  // fullFilePath = string, the local file path and name
  // failPlugin: failPlugin
  // });

  if (await cache.has(fullFilePath)) {
    await cache.restore(fullFilePath);
    const cacheDate = await readFile({
      file: fullFilePath,
      failPlugin: failPlugin
    });

    // Log cache timestamp in console
    log({
      color: yellow,
      label: "Restoring markdown cache from",
      value: cacheDate
    });
    return new Date(cacheDate);
  } else {
    // Log no cache file found
    log({
      color: yellow,
      label: "No cache file found"
    });
    return 0;
  }
};

const writeCacheTimestamp = async ({ cache, fullFilePath, failPlugin }) => {
  // writeCacheTimestamp({
  // cache = cache
  // fullFilePath = string, the local file path and name
  // failPlugin = failPlugin
  // });

  // Get the timestamp of right now
  const now = new Date();
  const nowISO = now.toISOString();

  // Write the time into a cache file
  await writeFile({
    fullFilePath: fullFilePath,
    content: `"${nowISO}"`,
    failPlugin: failPlugin
  });

  await cache.save(fullFilePath);

  // Log cache timestamp creation time
  log({
    color: yellow,
    label: "Caching markdown at",
    value: nowISO
  });
};

const readFile = async ({ file, failPlugin }) => {
  // readFile({
  // file = string, the local file path and name
  // failPlugin = failPlugin
  // });

  // Replace root path syntax with environment
  const fullFilePath = file.replace("./", `${process.cwd()}/`);
  const fileContent = require(fullFilePath);

  // Return file content
  return fileContent;
};

const getAllImages = ({ contentItems, imagesPath }) => {
  // getAllImages({
  // contentItems = array, post and page objects
  // imagesPath = string, the base path for Ghost images
  // });

  const htmlWithImages = contentItems
    .filter(item => {
      return item.html && item.html.includes(imagesPath);
    })
    .map(filteredItem => filteredItem.html);

  const htmlImages = htmlWithImages
    .map(html => {
      return html.split(/[\ "]/).filter(slice => slice.includes(imagesPath));
    })
    .flat();

  const featureImages = contentItems
    .filter(item => {
      return item.feature_image && item.feature_image.includes(imagesPath);
    })
    .map(item => item.feature_image);

  const allImages = [...new Set([...htmlImages, ...featureImages])];

  return allImages;
};

// Begin plugin export
module.exports = {
  onPreBuild: async ({
    inputs: {
      ghostURL,
      ghostKey,
      assetsDir = "./assets/images/",
      pagesDir = "./",
      postsDir = "./_posts/",
      pagesLayout = "page",
      postsLayout = "post",
      postDatePrefix = true,
      cacheFile = "./_data/ghostMarkdownCache.json"
    },
    utils: {
      build: { failPlugin },
      cache
    }
  }) => {
    // Ghost images path
    const ghostImagePath = ghostURL + "/content/images/";

    // Initialise Ghost Content API
    const api = new ghostContentAPI({
      url: ghostURL,
      key: ghostKey,
      version: "v2"
    });

    const [posts, pages, cacheDate] = await Promise.all([
      getContent({
        contentType: api.posts,
        failPlugin: failPlugin
      }),
      getContent({
        contentType: api.pages,
        failPlugin: failPlugin
      }),
      getCacheTimestamp({
        cache: cache,
        fullFilePath: cacheFile,
        failPlugin: failPlugin
      })
    ]);

    await Promise.all([
      // Get all images from out of posts and pages
      ...getAllImages({
        contentItems: [...posts, ...pages],
        imagesPath: ghostImagePath
      }).map(async image => {
        // Create destination for each image
        const dest = image.replace(ghostImagePath, assetsDir);

        // If the image isn't in cache download it
        if (!(await cache.has(dest))) {
          await downloadImage({
            imagePath: image,
            outputPath: dest,
            failPlugin: failPlugin
          });

          // Cache the image
          await cache.save(dest);

          log({
            color: green,
            label: "Downloaded and cached",
            value: dest
          });
        } else {
          // Restore the image if it's already in the cache
          await cache.restore(dest);

          log({
            color: cyan,
            label: "Restored from cache",
            value: dest
          });
        }
      }),
      ...posts.map(async post => {
        // Set the file name using the post slug
        let fileName = `${post.slug}.md`;

        // If postDatePrefix is true prefix file with post date
        if (postDatePrefix) {
          fileName = `${post.published_at.slice(0, 10)}-${post.slug}.md`;
        }

        // The full file path and name
        const fullFilePath = postsDir + fileName;

        // Get the post updated date and last cached date
        const postUpdatedAt = new Date(post.updated_at);

        if ((await cache.has(fullFilePath)) && cacheDate > postUpdatedAt) {
          // Restore markdown from cache
          await cache.restore(fullFilePath);

          log({
            color: cyan,
            label: "Restored from cache",
            value: fullFilePath
          });
        } else {
          // Generate markdown file
          await writeFile({
            fullFilePath: fullFilePath,
            content: createMarkdownContent({
              content: post,
              imagesPath: ghostImagePath,
              assetsDir: getRelativeImagePath({
                imagePath: assetsDir,
                contentPath: postsDir
              }),
              layout: postsLayout
            })
          });
          // Cache the markdown file
          await cache.save(fullFilePath);

          log({
            color: green,
            label: "Generated and cached",
            value: fullFilePath
          });
        }
      }),
      ...pages.map(async page => {
        // Set the file name using the page slug
        let fileName = `${page.slug}.md`;

        // The full file path and name
        const fullFilePath = pagesDir + fileName;

        // Get the page updated date and last cached date
        const pageUpdatedAt = new Date(page.updated_at);

        if ((await cache.has(fullFilePath)) && cacheDate > pageUpdatedAt) {
          // Restore markdown from cache
          await cache.restore(fullFilePath);

          log({
            color: cyan,
            label: "Restored from cache",
            value: fullFilePath
          });
        } else {
          // Generate markdown file
          await writeFile({
            fullFilePath: fullFilePath,
            content: createMarkdownContent({
              content: page,
              imagesPath: ghostImagePath,
              assetsDir: getRelativeImagePath({
                imagePath: assetsDir,
                contentPath: pagesDir
              }),
              layout: pagesLayout
            })
          });
          // Cache the markdown file
          await cache.save(fullFilePath);

          log({
            color: green,
            label: "Generated and cached",
            value: fullFilePath
          });
        }
      })
    ]).then(async response => {
      // Write a new cache file
      await writeCacheTimestamp({
        cache: cache,
        fullFilePath: cacheFile,
        failPlugin: failPlugin
      });
    });
  }
};
