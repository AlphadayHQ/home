import React from "react";
import alphaday from "../../images/logo.png";
import CONFIG from "../../config";

const NAV_LINKS = [
  { label: "The Layer", href: "#layer" },
  { label: "Builders", href: "#builders" },
  { label: "Products", href: "#products" },
  { label: "FAQ", href: "#faq" },
  { label: "Docs", href: CONFIG.apiDocs },
];

/**
 * Sticky nav for the home page. The shared <Navbar /> is the orange bar still
 * used by /mobile, /privacy and the project landing pages — this one matches
 * the dark treatment the home page and /api share.
 */
function HomeNavbar() {
  return (
    <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-surface-border">
      <div className="mx-auto w-11/12 max-w-7xl h-16.5 flex items-center justify-between">
        <a href="/" aria-label="Alphaday home">
          <img src={alphaday} className="h-6.25 object-fit" alt="Alphaday" />
        </a>

        <div className="hidden lg:flex items-center gap-6.5 text-sm font-medium">
          {NAV_LINKS.map(({ label, href }) => (
            <a
              key={label}
              href={href}
              className="text-text-muted hover:text-text transition-colors"
            >
              {label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-2.5">
          <a
            className="hidden sm:inline-block border border-surface-border text-text rounded-lg px-4.5 py-2.5 text-[13.5px] font-bold hover:border-primary/50 hover:-translate-y-px transition-all duration-200"
            href={CONFIG.alphadayApp}
          >
            Launch app
          </a>
          <a
            className="btn-primary rounded-lg px-4.5 py-2.5 text-[13.5px]"
            href={CONFIG.api}
          >
            Start building
          </a>
        </div>
      </div>
    </nav>
  );
}

export default HomeNavbar;
