const fs = require("fs-extra");
const path = require("path");
const fetch = require("node-fetch");
const url = require("url");
const ghostContentAPI = require("@tryghost/content-api");

// Get posts using Ghost Content API
const getPosts = async api => {
  const posts = await api.posts
    .browse({
      include: "tags,authors",
      limit: "all"
    })
    .catch(error => {
      console.error("Ghost posts error: " + error);
    });

  return posts;
};

// Get pages using Ghost Content API
const getPages = async api => {
  const pages = await api.pages
    .browse({
      include: "authors",
      limit: "all"
    })
    .catch(err => {
      console.error(err);
    });

  return pages;
};

// Get all images
const downloadImage = async (inputURI, outputRoot) => {
  // Grab file data from remote inputURI
  const fileData = await fetch(inputURI)
    .catch(err => {
      console.log("Image file error: " + err);
    })
    .then(res => res.buffer());
  // Write the file
  await fs.outputFile(outputRoot, fileData);
};

// Markdown template
const mdTemplate = (item, url, imagePath, assetsDir) => {
  const assetsPath = assetsDir.replace("./", "/");
  return `
---
date: ${item.published_at.slice(0, 10)}
title: ${item.title}
excerpt: "${item.custom_excerpt ? item.custom_excerpt : ""}"
image: "${
    item.feature_image
      ? item.feature_image.replace(url + imagePath, assetsPath)
      : ""
  }"
${item.tags ? `tags:${item.tags.map(tag => `\n  - ${tag.slug}`).join("")}` : ""}
---
${item.html.replace(new RegExp(url + imagePath, "g"), assetsPath)}
`.trim();
};

// Write markdown file
const writeMarkdown = (fileDir, fileName, content) => {
  fs.outputFile(fileDir + fileName, content, error => {
    error && console.log("Markdown file error: " + error);
  });
};

module.exports = {
  name: "netlify-plugin-ghost-markdown",
  onPreBuild: async ({
    pluginConfig: {
      ghostURL,
      ghostKey,
      assetsDir = "./assets/images/",
      pagesDir = "./",
      postsDir = "./_posts/",
      postDatePrefix = true
    }
  }) => {
    // Ghost images path
    const ghostImagePath = "/content/images/";

    // Initialise Ghost Content API
    const api = new ghostContentAPI({
      url: ghostURL,
      key: ghostKey,
      version: "v2"
    });

    // Get pages and posts
    let posts = await getPosts(api);
    let pages = await getPages(api);

    // Replace Ghost image paths with local ones
    [...posts, ...pages].forEach(item => {
      const images = [
        ...item.html.split('"').filter(slice => slice.includes(ghostImagePath)),
        ...(item.feature_image ? [item.feature_image] : [])
      ].forEach(image => {
        downloadImage(
          image,
          image.replace(ghostURL + ghostImagePath, assetsDir)
        );
      });
    });

    // Generate markdown posts
    posts.forEach(post => {
      console.log("Creating post: " + post.title);
      const filename = postDatePrefix
        ? `${post.published_at.slice(0, 10)}-${post.slug}`
        : post.slug;
      writeMarkdown(
        postsDir,
        `${filename}.md`,
        mdTemplate(post, ghostURL, ghostImagePath, assetsDir)
      );
    });

    // Generate markdown pages
    pages.forEach(page => {
      console.log("Creating page: " + page.title);
      writeMarkdown(
        pagesDir,
        `${pagesDir + page.slug}.md`,
        mdTemplate(page, ghostURL, ghostImagePath, assetsDir)
      );
    });
  }
};
