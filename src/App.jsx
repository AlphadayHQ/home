import Error404 from "./components/Error404";
import Seo from "./components/seo";
import CookieDisclaimer from "./components/CookieDisclaimer";
import CONFIG from "./config";
import HomeContainer from "./containers/HomeContainer";
import { CookieProvider } from "./utils/CookieContext";
import PrivacyPolicyPage from "./pages/privacy-policy";
import MobilePage from "./pages/mobile-app";
import { useEffect } from "react";

function removeTrailingBackSlash(site) {
  return site.replace(/\/$/, "");
}

const otherPages = {
  [CONFIG.privacyPolicy]: <PrivacyPolicyPage />,
  [CONFIG.mobile]: <MobilePage />,
};

function App() {
  const path = removeTrailingBackSlash(window.location.pathname);

  const supportedPaths = ["", ...Object.keys(otherPages)];

  // Has navigator - scroll to the hash on the page
  useEffect(() => {
    // Handle initial hash on mount
    const handleInitialHash = () => {
      const hash = window.location.hash.slice(1); // removes #
      if (hash) {
        setTimeout(() => {
          const element = document.getElementById(hash);
          element?.scrollIntoView({ behavior: "smooth" });
        }, 100); // Small delay for React to render
      }
    };

    handleInitialHash();

    // Listen for hash changes
    window.addEventListener("hashchange", handleInitialHash);
    return () => window.removeEventListener("hashchange", handleInitialHash);
  }, []);

  if (!supportedPaths.includes(path)) {
    if (path.startsWith("/b/")) {
      window.location.replace(`${CONFIG.alphadayApp}${path}`);

      return <></>;
    }

    if (path === "/blog") {
      window.location.replace(CONFIG.blog);
      return <></>;
    }

    return <Error404 />;
  }
  return (
    <CookieProvider>
      <Seo
        title="Alphaday"
        description={"Everything about the Crypto ecosystem in one app"}
      />
      {Object.keys(otherPages).includes(path) ? (
        <>{otherPages[path]}</>
      ) : (
        <HomeContainer />
      )}
      <CookieDisclaimer />
    </CookieProvider>
  );
}

export default App;
