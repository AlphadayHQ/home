import React from "react";
import { Footer } from "../../components";
import HomeNavbar, { SITE_LINKS } from "../../components/navbar/HomeNavbar";

/*
 * The page is laid under the sticky navbar, so each page's first section sits
 * beneath it and leaves room for it (`pt-24` clears the nav's 66px). The
 * negative margin pulls the page up by exactly the nav's height; without it
 * every page would start a nav-height lower than it was designed to.
 *
 * The nav is the home page's, with the site-wide links: the orange bar this
 * replaced offered Discord, X and "Launch app", so an agent builder on an MCP
 * client page had no way to /api, the docs or the cookbook from the top.
 */
function Layout({ children }) {
  return (
    <div>
      <HomeNavbar links={SITE_LINKS} />
      <div className="-mt-16.5">
        {children}
        <Footer />
      </div>
    </div>
  );
}

export default Layout;
