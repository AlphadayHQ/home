import { useState, createContext } from "react";

// This default is load-bearing, not defensive boilerplate: <Seo> calls
// useContext(CookieContext) and the 404 route in App.jsx renders outside
// CookieProvider. Removing the default (or dropping `allowTracking` from it)
// crashes the 404 page. `false` is also the correct value there — a page
// nobody consented on should fire no trackers.
export const CookieContext = createContext({
  allowTracking: false,
  noCookieChoice: true,
  setCookieChoice: () => {},
});

const useCookieChoice = () => {
  const storageCookieChoice = localStorage.getItem("cookieChoice");
  const [cookieChoice, setCookieChoice] = useState(storageCookieChoice);

  const handleCookieChioce = (choice) => {
    setCookieChoice(choice);
    localStorage.setItem("cookieChoice", choice);
  };

  return {
    allowTracking: cookieChoice === "accept",
    noCookieChoice: cookieChoice === null,
    setCookieChoice: handleCookieChioce,
  };
};

export const CookieProvider = ({ children }) => {
  const { allowTracking, setCookieChoice, noCookieChoice } = useCookieChoice();
  return (
    <CookieContext.Provider
      value={{ allowTracking, setCookieChoice, noCookieChoice }}
    >
      {children}
    </CookieContext.Provider>
  );
};
