import "../assets/css/error.css";
import logoDay from "../assets/svg/logo-white.svg";

/**
 * The 404 body. Served with a real HTTP 404 by the SSR handler (§5.2) — the
 * current SPA returns 200 with this markup, which is a soft 404 and the reason
 * `/dashboards` was being treated as a duplicate of the home page.
 *
 * The head is set by the route, not here: `noindex, follow` and no canonical.
 * `follow` rather than `nofollow` because the link back to the home page is
 * still a legitimate signal even on a page not worth indexing.
 *
 * The old version linked to `window.location.origin`, which throws during SSR.
 * A root-relative "/" is both server-safe and the same destination.
 */
const NotFound = () => (
  <>
    <div className="main">
      <h1>
        <span>404</span>
      </h1>
      <p>Sorry, the page you are looking for could not be found.</p>
      <a href="/" className="logo button">
        <img src={logoDay} alt="alphaday logo" /> Back to Home
      </a>
    </div>
    <footer>
      <div id="footer">&copy;Alphaday {new Date().getFullYear()}</div>
    </footer>
  </>
);

export default NotFound;
