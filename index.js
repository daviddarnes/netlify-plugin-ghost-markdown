const fs = require("fs-extra");
const path = require("path");
const fetch = require("node-fetch");
const url = require("url");
const chalk = require("chalk");
const ghostContentAPI = require("@tryghost/content-api");

// Get posts using Ghost Content API
const getPosts = async (api, failPlugin) => {
  try {
    const posts = await api.posts.browse({
      include: "tags,authors",
      limit: "all"
    });
    return posts;
  } catch (error) {
    failPlugin("Ghost posts error", { error });
  }
};

// Get pages using Ghost Content API
const getPages = async (api, failPlugin) => {
  try {
    const pages = await api.pages.browse({
      include: "authors",
      limit: "all"
    });
    return pages;
  } catch (error) {
    failPlugin("Ghost pages error", { error });
  }
};

// Download images
const downloadImage = async (inputURI, outputPath, failPlugin) => {
  try {
    // Grab file data from remote inputURI
    const res = await fetch(inputURI);
    const fileData = await res.buffer();

    // Write the file and cache it
    await fs.outputFile(outputPath, fileData);
  } catch (error) {
    failPlugin("Image file error", { error });
  }
};

// Relative image paths
const getRelativePath = (assetsDir, docDir) => {
  const explodedAssetsDir = assetsDir.split("/");
  const explodedDocDir = docDir.split("/");

  const difference = explodedAssetsDir.findIndex((slice, index) => {
    return explodedDocDir[index] != slice;
  });

  return "/" + explodedAssetsDir.slice(difference).join("/");
};

// Markdown template
const mdTemplate = (item, imagePath, assetsDir, layout) => {
  // Format fearture image path
  const formatFeatureImage = (path) => {
    if (path) {
      return path.replace(imagePath, assetsDir);
    }
    return "";
  };

  // Format tags into array string
  const formatTags = (tags) => {
    if (tags) {
      return `[${item.tags.map((tag) => tag.name).join(", ")}]`;
    }
    return "";
  };

  // Format HTML with updated image parths
  const formatHtml = (html) => {
    if (html) {
      return html.replace(new RegExp(imagePath, "g"), assetsDir);
    }
    return "";
  };

  // Return markdown template with frontmatter
  return `
---
date: ${item.published_at.slice(0, 10)}
title: "${item.title}"
layout: ${layout}
excerpt: "${item.custom_excerpt ? item.custom_excerpt : ""}"
image: "${formatFeatureImage(item.feature_image)}"
tags: ${formatTags(item.tags)}
---
${formatHtml(item.html)}
`.trim();
};

// Write markdown file
const writeMarkdown = async (fileDir, fileName, content, failPlugin) => {
  try {
    await fs.outputFile(fileDir + fileName, content);
  } catch (error) {
    failPlugin("Markdown file error", { error });
  }
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
      postDatePrefix = true
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

    // Get pages, posts and images
    const [posts, pages] = await Promise.all([
      getPosts(api, failPlugin),
      getPages(api, failPlugin)
    ]);

    // Find all images
    const findImages = (allContent) => {
      // Find all posts and pages with images in the HTML
      const htmlWithImages = allContent
        .filter((item) => item.html && item.html.includes(ghostImagePath))
        .map((item) => item.html);

      // Get all images from posts and pages
      const htmlImages = htmlWithImages
        .map((html) =>
          html.split('"').filter((slice) => {
            return slice.includes(ghostImagePath);
          })
        )
        .flat();

      // Get all feature images from posts and pages
      const featureImages = allContent
        .filter(
          (item) =>
            item.feature_image && item.feature_image.includes(ghostImagePath)
        )
        .map((item) => item.feature_image);

      // Clear up and possible duplicates
      const allImages = [...new Set([...htmlImages, ...featureImages])];

      return allImages;
    };

    // Generate all images, posts and pages…
    await Promise.all([
      // Replace Ghost image paths with local ones
      ...findImages([...posts, ...pages]).map(async (image) => {
        // Image destination
        const dest = image.replace(ghostImagePath, assetsDir);

        // Check if image is in Netlify cache
        if (await cache.has(dest)) {
          // Restore image from cache
          await cache.restore(dest);
          console.log(
            chalk.green("Restored from cache: ") + chalk.green.underline(dest)
          );
        } else {
          // …otherwise download the image and cache it
          await downloadImage(image, dest, failPlugin);
          await cache.save(dest);
          console.log(
            chalk.cyan("Downloading and caching: ") + chalk.cyan.underline(dest)
          );
        }
      }),

      // Generate markdown posts
      ...posts.map(async (post) => {
        // Prefix filename with date, Jekyll style formatting
        const filename = postDatePrefix
          ? `${post.published_at.slice(0, 10)}-${post.slug}`
          : post.slug;

        // Remove initial matching paths for relative source path
        const relativeAssetsDir = getRelativePath(assetsDir, postsDir);

        // Create post markdown file with content
        await writeMarkdown(
          postsDir,
          `${filename}.md`,
          mdTemplate(post, ghostImagePath, relativeAssetsDir, postsLayout),
          failPlugin
        );
        console.log(
          chalk.gray("Generated post: ") + chalk.gray.underline(post.title)
        );
      }),

      // Generate markdown pages
      ...pages.map(async (page) => {
        // Remove initial matching paths for relative source path
        const relativeAssetsDir = getRelativePath(assetsDir, pagesDir);

        // Create page markdown file with content
        await writeMarkdown(
          pagesDir,
          `${page.slug}.md`,
          mdTemplate(page, ghostImagePath, relativeAssetsDir, pagesLayout),
          failPlugin
        );
        console.log(
          chalk.gray("Generated page: ") + chalk.gray.underline(page.title)
        );
      })
    ]);
  }
};
