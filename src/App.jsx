import Seo from "./components/seo";
import HomeContainer from "./containers/HomeContainer";

function App() {
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
