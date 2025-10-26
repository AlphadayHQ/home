export const navigateToHash = () => {
  const hash = window.location.hash.slice(1);
  if (!hash) return;

  // Keep trying until element exists (max 50 attempts)
  let attempts = 0;
  const tryScroll = () => {
    const element = document.getElementById(hash);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    } else if (attempts < 50) {
      attempts++;
      setTimeout(tryScroll, 500); // Retry every 500ms
    }
  };

  // Wait for DOM to be ready
  if (document.readyState === "complete") {
    tryScroll();
  } else {
    window.addEventListener("load", tryScroll);
  }
};
