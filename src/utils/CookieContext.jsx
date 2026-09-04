import { useState, useEffect, createContext } from "react";

// This default is load-bearing, not defensive boilerplate: consumers can render
// outside CookieProvider (the 404 shell, and anything rendered before hydration
// completes). `false` is also the correct value there — a page nobody consented
// on should fire no trackers.
export const CookieContext = createContext({
  allowTracking: false,
  noCookieChoice: false,
  setCookieChoice: () => {},
});

/**
 * `localStorage` does not exist on the server, and reading it during render is
 * what made this module throw under SSR. It is read once after mount instead.
 *
 * The choice is tri-state on purpose. `undefined` means "not read yet", which
 * is what both the server and the first client render see — so the disclaimer
 * is absent in both and hydration matches. Starting at `null` ("no choice
 * made") would instead render the banner on the server, hide it a frame later
 * on the client, and produce a hydration mismatch plus a visible flash for
 * every returning visitor.
 */
const readStoredChoice = () => {
  try {
    return localStorage.getItem("cookieChoice");
  } catch {
    // Private mode and storage-blocked browsers throw rather than return null.
    return null;
  }
};

const useCookieChoice = () => {
  const [cookieChoice, setCookieChoice] = useState(undefined);

  useEffect(() => {
    setCookieChoice(readStoredChoice());
  }, []);

  const handleCookieChoice = (choice) => {
    setCookieChoice(choice);
    try {
      localStorage.setItem("cookieChoice", choice);
    } catch {
      // A refused write means we ask again next visit, which is acceptable.
    }
  };

  return {
    allowTracking: cookieChoice === "accept",
    // Only true once we have actually looked and found nothing.
    noCookieChoice: cookieChoice === null,
    setCookieChoice: handleCookieChoice,
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
