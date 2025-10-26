export const navigateToHash = () => {
  const hash = window.location.hash.slice(1);
  if (!hash) return;

  // Add debugging
  console.log("Looking for element:", hash);
  console.log(
    "All IDs on page:",
    Array.from(document.querySelectorAll("[id]")).map((el) => el.id)
  );

  const element = document.getElementById(hash);
  if (element) {
    console.log("Found element, scrolling...");
    element.scrollIntoView({ behavior: "smooth", block: "start" });
  }
};
