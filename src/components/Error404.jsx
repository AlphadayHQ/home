import React from "react";
import Seo from "./seo";
import "../assets/css/error.css";
import logoDay from "../assets/svg/logo-white.svg";


const Error404 = () => {
  return (
    <>
      {/* `follow` rather than `nofollow`: the page is worthless to index but its
          link back to the home page is still a legitimate signal. The canonical
          is self-referential so a 404 never claims to be another page. */}
      <Seo
        title="Page not found — Alphaday"
        description="The page you are looking for could not be found."
        robots="noindex, follow"
      />
      <div className="main">
        <>
          <h1>
            <span>404</span>
          </h1>
          <p>Sorry, the page you are looking for could not be found.</p>
        </>
        <a href={window.location.origin} className="logo button">
          <img src={logoDay} alt="alphaday logo" /> Back to Home
        </a>
      </div>
      <footer>
        <div id="footer">
          &copy;Alphaday
          {new Date().getFullYear()}
        </div>
      </footer>
    </>
  );
};

export default Error404;
