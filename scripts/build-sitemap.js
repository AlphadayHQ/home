const sitemaps = require("sitemaps");

const filePath = `${__dirname}/../dist/sitemap.xml`;
const baseUrl = "https://www.alphaday.com";
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
        loc: `${appUrl}/b/alpha`,
        priority: "0.80",
        changefreq: "weekly",
    },
    {
        loc: `${appUrl}/b/beginner`,
        priority: "0.80",
        changefreq: "weekly",
    },
    {
        loc: `${appUrl}/b/nft`,
        priority: "0.80",
        changefreq: "weekly",
    },
    {
        loc: `${appUrl}/b/trading`,
        priority: "0.80",
        changefreq: "weekly",
    },
    {
        loc: `${appUrl}/b/arbitrum`,
        priority: "0.80",
        changefreq: "weekly",
    },
];

sitemaps(filePath, links);
