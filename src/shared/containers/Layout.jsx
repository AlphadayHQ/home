import React from "react";
import { Navbar, Footer } from "../../components";

/*
 * The page is laid over the navbar's place, so each page's first section sits
 * under the floating navbar and leaves room for it. The footer goes inside that
 * same layer, after the page: outside it, the footer sat in the flow at the top,
 * beneath the page, where nobody could see it.
 */
function Layout({ children }) {
  return (
    <div>
      <Navbar />
      <div className="absolute top-0 left-0 w-full">
        {children}
        <Footer />
      </div>
    </div>
  );
}

export default Layout;
