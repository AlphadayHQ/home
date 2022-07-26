import React from "react";
import Helmet from "react-helmet";
import config from "../config.json";

// recommended dimensions for thumbnail that appears when someone shares your website: 1200 pixels x 627 pixels (1.91/1 ratio)

const SEO = ({
  title,
  description,
}) => {
  //date format: 2015-02-05T08:00:00+08:00
  const { domain, socialLinks, cover } = config.seo;
  const titleToShow = title || config.seo.defaultTitle;
  const descriptionToShow = description || config.seo.defaultDescription;

  return (
    <Helmet>
      <meta
        name="robots"
        content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"
        data-react-helmet="true"
      />
      <title>{titleToShow}</title>
      <meta
        name="description"
        content={descriptionToShow}
        data-react-helmet="true"
      />
      <meta
        property="og:site_name"
        content={config.seo.siteName}
        data-react-helmet="true"
      />
      {/* Opengraph meta tags for Facebook & LinkedIn */}
      <meta property="og:url" content={domain} data-react-helmet="true" />
      <meta property="og:type" content={"website"} data-react-helmet="true" />
      <meta
        property="og:title"
        content={titleToShow}
        data-react-helmet="true"
      />
      <meta
        property="og:description"
        content={descriptionToShow}
        data-react-helmet="true"
      />
      <meta
        property="og:image"
        content={cover}
        data-react-helmet="true"
      />

      {/*You can get this id when you create an app id on Facebook of your Facebook page*/}
      {/* <meta
        property="fb:app_id"
        content={socialLinks.facebookAppId}
        data-react-helmet="true"
      /> */}

      {/*These tags work for Twitter & Slack */}
      <meta
        name="twitter:card"
        content="summary_large_image"
        data-react-helmet="true"
      />
      <meta
        name="twitter:site"
        content={socialLinks.twitter}
        data-react-helmet="true"
      />
      <meta name="twitter:domain" content={domain} data-react-helmet="true" />
      <meta
        name="twitter:title"
        content={titleToShow}
        data-react-helmet="true"
      />
      <meta
        name="twitter:description"
        content={`${descriptionToShow}`}
        data-react-helmet="true"
      />
      <meta
        name="twitter:image"
        content={cover}
        data-react-helmet="true"
      />
    </Helmet>
  );
};

export default SEO;
