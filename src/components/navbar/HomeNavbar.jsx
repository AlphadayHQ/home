import React from "react";
import { Menu } from "lucide-react";
import alphaday from "../../images/logo.webp";
import CONFIG from "../../config";

const NAV_LINKS = [
  { label: "The Layer", href: "#layer" },
  { label: "Builders", href: "#builders" },
  { label: "Products", href: "#products" },
  { label: "MCP", href: CONFIG.mcp },
  { label: "Cookbook", href: CONFIG.cookbook },
  { label: "FAQ", href: "#faq" },
  { label: "Docs", href: CONFIG.apiDocs },
];

/*
 * Every other page that wears this nav (through `Layout`). The home page's
 * anchors mean nothing off the home page, so these are the pages an agent
 * builder goes to next, with the app's shop window last.
 */
export const SITE_LINKS = [
  { label: "MCP", href: CONFIG.mcp },
  { label: "Cookbook", href: CONFIG.cookbook },
  { label: "Docs", href: CONFIG.apiDocs },
  { label: "Dashboards", href: CONFIG.dashboards },
];

/**
 * Sticky nav for the home page and every `Layout` page. The shared <Navbar />
 * is the orange bar still used by /mobile, /privacy, /dashboards and the
 * project landing pages — this one matches the dark treatment the home page
 * and /api share, and puts "Start building" at the top of every page wearing it.
 */
function HomeNavbar({ links = NAV_LINKS }) {
  return (
    <nav className="sticky top-0 z-50 bg-background border-b border-surface-border">
      <div className="mx-auto w-11/12 max-w-7xl h-16.5 flex items-center justify-between">
        <a href="/" aria-label="Alphaday home">
          <img src={alphaday} className="h-6.25 object-fit" alt="Alphaday" />
        </a>

        <div className="hidden lg:flex items-center gap-6.5 text-sm font-medium">
          {links.map(({ label, href }) => (
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
            className="hidden sm:inline-block border border-surface-border text-text rounded-lg px-4.5 py-3 text-[13.5px] font-medium hover:border-primary/50 hover:-translate-y-px transition-all duration-200"
            href={CONFIG.alphadayApp}
          >
            Launch app
          </a>
          <a
            className="btn-primary rounded-lg px-4.5 py-3 text-[13.5px] font-medium"
            href={CONFIG.api}
          >
            Start building
          </a>

          {/*
            Below lg the links above are hidden, so they live here. A
            <details> opens without JavaScript, so the menu works in the
            server-rendered page, and its panel hangs below the bar rather than
            growing it — `Layout` offsets every page by the bar's 66px.
          */}
          <details className="group lg:hidden">
            <summary
              aria-label="Menu"
              className="list-none [&::-webkit-details-marker]:hidden cursor-pointer flex h-10.5 w-10.5 items-center justify-center rounded-lg border border-surface-border text-text group-open:border-primary/50"
            >
              <Menu className="h-4.5 w-4.5" aria-hidden="true" />
            </summary>
            <div
              // An in-page anchor on the home page would otherwise leave the
              // menu open over the section it scrolled to.
              onClick={(e) => {
                if (e.target.closest("a")) e.currentTarget.parentElement.open = false;
              }}
              className="absolute left-0 right-0 top-full border-b border-surface-border bg-background"
            >
              <div className="mx-auto w-11/12 max-w-7xl flex flex-col py-3">
                {links.map(({ label, href }) => (
                  <a
                    key={label}
                    href={href}
                    className="py-3 text-[15px] font-medium text-text-muted hover:text-text transition-colors"
                  >
                    {label}
                  </a>
                ))}
                <a
                  href={CONFIG.alphadayApp}
                  className="sm:hidden py-3 text-[15px] font-medium text-text-muted hover:text-text transition-colors"
                >
                  Launch app
                </a>
              </div>
            </div>
          </details>
        </div>
      </div>
    </nav>
  );
}

export default HomeNavbar;
