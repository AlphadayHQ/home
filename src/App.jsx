import Error404 from "./components/Error404";
import FeedBack from "./components/Feedback";
import Seo from "./components/seo";
import CONFIG from "./config";
import HomeContainer from "./containers/HomeContainer";

function App() {
  const path = window.location.pathname;

  if (path !== "/") {
    if (path.startsWith("/b/")) {
      window.location.replace(`${CONFIG.alphadayApp}${path}`);

      return <></>;
    }

    if (path === "/blog") {
      window.location.replace(CONFIG.blog);
      return <></>;
    }

    if (path === "/feedback") {
      return <FeedBack />;
    }

    return <Error404 />;
  }
  return (
    <>
      <Seo
        title="Alphaday"
        description={"Everything about the Crypto ecosystem in one app"}
      />
      <HomeContainer />
    </>
  );
}

export default App;
