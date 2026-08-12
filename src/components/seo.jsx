import React, { useContext, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import TagManager from "react-gtm-module";
import config from "../config";
import { CookieContext } from "../utils/CookieContext";

// index.html ships a static copy of these tags so social scrapers — which do
// not execute JS — always get something. Helmet can't replace tags it didn't
// create, so it appends its own and the page ends up with two of each. On any
// route other than /, the static pair describes the wrong page and lands first
// in the document. Drop the static ones once Helmet has rendered: JS-executing
// crawlers then see exactly one set (the route's), and the no-JS fallback in
// the raw HTML is untouched.
const MANAGED_META =
  'meta[name="description"], meta[property^="og:"], meta[name^="twitter:"]';

const isHelmetTag = (tag) =>
  tag.hasAttribute("data-react-helmet") || tag.hasAttribute("data-rh");

// og:* identify by `property`, description/twitter:* by `name`.
const metaKey = (tag) => tag.getAttribute("property") || tag.getAttribute("name");

/**
 * Remove a static tag only when Helmet's replacement for that exact key is
 * already in the head. Matching per key rather than per selector means a tag
 * Helmet doesn't manage (or hasn't written yet) is never left with no
 * counterpart — the failure mode is a surviving duplicate, not a missing tag.
 */
const pruneStaticDuplicates = () => {
  const byKey = new Map();

  document.head.querySelectorAll(MANAGED_META).forEach((tag) => {
    const key = metaKey(tag);
    if (!key) return;
    byKey.set(key, [...(byKey.get(key) || []), tag]);
  });

  byKey.forEach((tags) => {
    if (!tags.some(isHelmetTag)) return;
    tags.filter((tag) => !isHelmetTag(tag)).forEach((tag) => tag.remove());
  });
};

const useDedupeStaticMetaTags = () => {
  useEffect(() => {
    // react-helmet-async defers its DOM writes into requestAnimationFrame, which
    // lands after every useEffect. Pruning here directly would delete the static
    // tags before the replacements exist — and in a hidden tab, where rAF is
    // throttled indefinitely, the head could sit with no SEO tags at all. Wait
    // two frames so Helmet has committed; if rAF never fires we simply keep the
    // duplicates, which is the safe direction to fail in.
    let secondFrame;
    const firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(pruneStaticDuplicates);
    });

    return () => {
      cancelAnimationFrame(firstFrame);
      if (secondFrame) cancelAnimationFrame(secondFrame);
    };
  }, []);
};

// const tagManagerArgs = {
//   gtmId: "G-ZT80HRR0MD",
// };

//           TagManager.initialize(tagManagerArgs)

// recommended dimensions for thumbnail that appears when someone shares your website: 1200 pixels x 627 pixels (1.91/1 ratio)

const SEO = ({ title, description, canonical, ogImage, jsonLd }) => {
  //date format: 2015-02-05T08:00:00+08:00
  const { domain, socialLinks, cover } = config.seo;
  const titleToShow = title || config.seo.defaultTitle;
  const descriptionToShow = description || config.seo.defaultDescription;
  const ogImageToShow = ogImage || cover;
  const canonicalUrl = canonical || domain;
  const { allowTracking } = useContext(CookieContext);

  useDedupeStaticMetaTags();

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
      <link rel="canonical" href={canonicalUrl} data-react-helmet="true" />
      <meta
        property="og:site_name"
        content={config.seo.siteName}
        data-react-helmet="true"
      />
      {/* Opengraph meta tags for Facebook & LinkedIn */}
      <meta property="og:url" content={canonicalUrl} data-react-helmet="true" />
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
      <meta property="og:image" content={ogImageToShow} data-react-helmet="true" />

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
      <meta name="twitter:image" content={ogImageToShow} data-react-helmet="true" />
      {jsonLd && (
        <script type="application/ld+json" data-react-helmet="true">
          {JSON.stringify(jsonLd)}
        </script>
      )}
      {/* <!-- Global site tag (gtag.js) - Google Analytics --> */}
      {allowTracking && (
        <script
          async
          src="https://www.googletagmanager.com/gtag/js?id=G-ZT80HRR0MD"
        ></script>
      )}
      {allowTracking && (
        <script>
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag("js", new Date());

            gtag("config", "G-ZT80HRR0MD");
          `}
        </script>
      )}

      {/* <!-- Hotjar Tracking Code for https://alphaday.app --> */}
      {allowTracking && (
        <script>
          {`(function(h,o,t,j,a,r){ h.hj=h.hj||function(){(h.hj.q=h.hj.q||[]).push(arguments)}; h._hjSettings={hjid:3387342,hjsv:6}; a=o.getElementsByTagName('head')[0]; r=o.createElement('script');r.async=1; r.src=t+h._hjSettings.hjid+j+h._hjSettings.hjsv; a.appendChild(r); })(window,document,'https://static.hotjar.com/c/hotjar-','.js?sv=');`}
        </script>
      )}

    {/* <!-- Twitter conversion tracking base code --> */}
      {allowTracking && (
        <script>
          {`
            !function(e,t,n,s,u,a){e.twq||(s=e.twq=function(){s.exe?s.exe.apply(s,arguments):s.queue.push(arguments);
            },s.version='1.1',s.queue=[],u=t.createElement(n),u.async=!0,u.src='https://static.ads-twitter.com/uwt.js',
            a=t.getElementsByTagName(n)[0],a.parentNode.insertBefore(u,a))}(window,document,'script');
            twq('config','od1rs');
          `}
        </script>
      )}
      {/* <!-- End Twitter conversion tracking base code --> */}
      {allowTracking && (
        <script type="text/javascript">
          {`
            adroll_adv_id = "3LHFBUQ7YNEDPHSNUFWWAS"; adroll_pix_id = "TFEJXDJ5WFCRFEFX7UWG7O"; adroll_version = "2.0";  
            (function(w, d, e, o, a) { w.__adroll_loaded = true; w.adroll = w.adroll || [];
            w.adroll.f = [ 'setProperties', 'identify', 'track' ]; var roundtripUrl = "https://s.adroll.com/j/" + adroll_adv_id + "/roundtrip.js";
            for (a = 0; a < w.adroll.f.length; a++) { w.adroll[w.adroll.f[a]] = w.adroll[w.adroll.f[a]] || (function(n) { return function() {
            w.adroll.push([ n, arguments ]) } })(w.adroll.f[a]) }  e = d.createElement('script');
            o = d.getElementsByTagName('script')[0]; e.async = 1; e.src = roundtripUrl;
            o.parentNode.insertBefore(e, o); })(window, document); adroll.track("pageView");
          `}
        </script>
      )}
    </Helmet>
  );
};

export default SEO;
