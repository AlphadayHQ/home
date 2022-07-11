import { useState } from "react";
import Seo from "./components/seo";
import HomeContainer from "./containers/HomeContainer";

function App() {
  const [count, setCount] = useState(0);

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
