import Error404 from "./components/Error404";
import Seo from "./components/seo";
import CookieDisclaimer from "./components/CookieDisclaimer";
import CONFIG from "./config";
import HomeContainer from "./containers/HomeContainer";
import { CookieProvider } from "./utils/CookieContext";
import PrivacyPolicyPage from "./pages/privacy-policy";
import MobilePage from "./pages/mobile-app";
import { useEffect } from "react";
import { navigateToHash } from "./utils/navigateToHash";

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
    let timeoutId = null;
    let isActive = true;

    // Run after a small delay to ensure hydration
    const initialTimeout = setTimeout(
      () => navigateToHash(timeoutId, isActive),
      100
    );

    window.addEventListener("hashchange", () =>
      navigateToHash(timeoutId, isActive)
    );

    return () => {
      isActive = false;
      clearTimeout(initialTimeout);
      if (timeoutId) clearTimeout(timeoutId);
      window.removeEventListener("hashchange", () =>
        navigateToHash(timeoutId, isActive)
      );
    };
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
