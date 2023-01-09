const sitemaps = require("sitemaps");

const filePath = `${__dirname}/../dist/sitemap.xml`;
const baseUrl = "https://www.alphaday.com";

const links = [
    {
        loc: baseUrl,
        priority: "1.00",
        changefreq: "weekly",
    },
];

sitemaps(filePath, links);
