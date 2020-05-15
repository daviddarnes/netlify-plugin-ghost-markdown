const fs = require("fs-extra");
const path = require("path");
const fetch = require("node-fetch");
const url = require("url");
const ghostContentAPI = require("@tryghost/content-api");

// Get posts using Ghost Content API
const getPosts = async (api, failPlugin) => {
  try {
    const posts = await api.posts.browse({
      include: "tags,authors",
      limit: "all",
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
      limit: "all",
    });
    return pages;
  } catch (error) {
    failPlugin("Ghost pages error", { error });
  }
};

// Get all images
const downloadImage = async (inputURI, outputRoot, failPlugin) => {
  try {
    // Grab file data from remote inputURI
    const res = await fetch(inputURI);
    const fileData = await res.buffer();

    // Write the file
    await fs.outputFile(outputRoot, fileData);
  } catch (error) {
    failPlugin("Image file error", { error });
  }
};

// Markdown template
const mdTemplate = (item, url, imagePath, assetsDir, layout) => {
  const assetsPath = assetsDir.replace("./", "/");
  return `
---
date: ${item.published_at.slice(0, 10)}
title: ${item.title}
layout: ${layout}
excerpt: "${item.custom_excerpt ? item.custom_excerpt : ""}"
image: "${
    item.feature_image
      ? item.feature_image.replace(url + imagePath, assetsPath)
      : ""
  }"
${item.tags ? `tags: [${item.tags.map((tag) => tag.name).join(", ")}]` : ""}
---
${
  item.html
    ? item.html.replace(new RegExp(url + imagePath, "g"), assetsPath)
    : ""
}
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
      postDatePrefix = true,
    },
    utils: {
      build: { failPlugin },
    },
  }) => {
    // Ghost images path
    const ghostImagePath = "/content/images/";

    // Initialise Ghost Content API
    const api = new ghostContentAPI({
      url: ghostURL,
      key: ghostKey,
      version: "v2",
    });

    // Get pages, posts and images
    const [posts, pages] = await Promise.all([
      getPosts(api, failPlugin),
      getPages(api, failPlugin),
    ]);
    const images = [].concat(
      ...[...posts, ...pages]
        .filter((item) => item.html)
        .map((item) => [
          ...item.html.split('"').filter((slice) => {
            slice.includes(ghostImagePath);
          }),
          ...(item.feature_image && item.feature_image.includes(ghostImagePath)
            ? [item.feature_image]
            : []),
        ])
    );

    await Promise.all([
      // Replace Ghost image paths with local ones
      ...images.map((image) =>
        downloadImage(
          image,
          image.replace(ghostURL + ghostImagePath, assetsDir),
          failPlugin
        )
      ),

      // Generate markdown posts
      ...posts.map(async (post) => {
        console.log("Creating post: " + post.title);
        const filename = postDatePrefix
          ? `${post.published_at.slice(0, 10)}-${post.slug}`
          : post.slug;
        await writeMarkdown(
          postsDir,
          `${filename}.md`,
          mdTemplate(post, ghostURL, ghostImagePath, assetsDir, postsLayout),
          failPlugin
        );
      }),

      // Generate markdown pages
      ...pages.map(async (page) => {
        console.log("Creating page: " + page.title);
        await writeMarkdown(
          pagesDir,
          `${pagesDir + page.slug}.md`,
          mdTemplate(page, ghostURL, ghostImagePath, assetsDir, pagesLayout),
          failPlugin
        );
      }),
    ]);
  },
};
