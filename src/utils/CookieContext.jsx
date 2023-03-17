import { useState, createContext } from "react";

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
