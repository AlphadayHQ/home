import Seo from "./components/seo";
import HomeContainer from "./containers/HomeContainer";

function App() {

  const path = window.location.pathname;
  if (path.startsWith("/b/")) {
    window.location.replace(`https://app.alphaday.com${path}`);

    return <></>;
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
