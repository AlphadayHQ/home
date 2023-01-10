const sitemaps = require("sitemaps");
const { resolve } = require("path");
const { existsSync, mkdirSync } = require("fs");

// path to app build directory
const distPath = resolve(__dirname, "../dist");
const outputName = "sitemap.xml";
const outputPath = `${distPath}/${outputName}`;

// ensure the build directory exists
// so we can run this script independent of the build.
if (!existsSync(distPath)) {
    mkdirSync(distPath);
}

const baseUrl = "https://alphaday.com";
const appUrl = "https://app.alphaday.com";

const links = [
    {
        loc: baseUrl,
        priority: "1.00",
        changefreq: "monthly",
    },
    {
        loc: `${baseUrl}/blog`,
        priority: "0.80",
        changefreq: "weekly",
    },
    {
        loc: appUrl,
        priority: "1.00",
        changefreq: "weekly",
    },
    {
        loc: `${appUrl}/calendar`,
        priority: "0.60",
        changefreq: "weekly",
    },
    {
        loc: `${appUrl}/b/alpha`,
        priority: "0.70",
        changefreq: "weekly",
    },
    {
        loc: `${appUrl}/b/beginner`,
        priority: "0.60",
        changefreq: "weekly",
    },
    {
        loc: `${appUrl}/b/nft`,
        priority: "0.60",
        changefreq: "weekly",
    },
    {
        loc: `${appUrl}/b/trading`,
        priority: "0.60",
        changefreq: "weekly",
    },
    {
        loc: `${appUrl}/b/arbitrum`,
        priority: "0.60",
        changefreq: "weekly",
    },
];

sitemaps(outputPath, links);
