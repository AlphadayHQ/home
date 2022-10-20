import Error404 from "./components/Error404";
import Seo from "./components/seo";
import HomeContainer from "./containers/HomeContainer";

function App() {
  const path = window.location.pathname;

  if (path !== "/") {
    if (path.startsWith("/b/")) {
      window.location.replace(`https://app.alphaday.com${path}`);

      return <></>;
    }

    if (path === "/blog") 
      window.location.replace(`https://alphaday.substack.com`);
    
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
