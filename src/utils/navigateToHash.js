export const navigateToHash = () => {
  const hash = window.location.hash.slice(1);
  if (!hash) return;

  const element = document.getElementById(hash);
  if (element) {
    console.log("Found element, scrolling...");
    element.scrollIntoView({ behavior: "smooth", block: "start" });
  }
};
