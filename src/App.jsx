import Error404 from "./components/Error404";
import Seo from "./components/seo";
import CookieDisclaimer from "./components/CookieDisclaimer";
import CONFIG from "./config";
import HomeContainer from "./containers/HomeContainer";
import { CookieProvider } from "./utils/CookieContext";
import PrivacyPolicyPage from "./pages/privacy-policy";
import MobilePage from "./pages/mobile-app";

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
