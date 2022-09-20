import React from "react";
import "../assets/css/error.css";
import logoDay from "../assets/svg/logo-white.svg";


const Error404 = () => {
  return (
    <>
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
