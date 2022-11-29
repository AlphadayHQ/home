const sitemaps = require("sitemaps");

const filePath = `${__dirname}/../dist/sitemap.xml`;
const baseUrl = "https://www.alphaday.com";

const links = [
    {
        loc: baseUrl,
        priority: "1.00",
        changefreq: "weekly",
    },
    {
        loc: `${baseUrl}/blog`,
        priority: "0.80",
        changefreq: "weekly",
    },
    {
        loc: `${baseUrl}/b/alpha`,
        priority: "0.80",
        changefreq: "weekly",
    },
    {
        loc: `${baseUrl}/b/beginner`,
        priority: "0.80",
        changefreq: "weekly",
    },
    {
        loc: `${baseUrl}/b/nft`,
        priority: "0.80",
        changefreq: "weekly",
    },
    {
        loc: `${baseUrl}/b/trading`,
        priority: "0.80",
        changefreq: "weekly",
    },
];

sitemaps(filePath, links);
