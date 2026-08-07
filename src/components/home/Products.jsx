import React from "react";
import { ArrowUpRight } from "lucide-react";
import { Section } from "../../shared";
import { products } from "./productsData";
import FlowArrows from "./FlowArrows";
import CONFIG from "../../config";

function Products() {
  const boards = CONFIG.featuredBoards;

  return (
    <Section id="products" className="bg-background scroll-mt-16">
      <div className="mx-auto w-11/12 max-w-7xl py-24">
        <p className="text-[13px] font-bold uppercase tracking-[0.14em] text-primary mb-3.5">
          Built on the layer
        </p>
        <h2 className="font-display text-[clamp(26px,3.6vw,38px)] leading-tight font-extrabold tracking-tight text-text max-w-180">
          We build on our own data layer — five products, 50,000+ users.
        </h2>
        <p className="text-text-muted text-[17px] max-w-160 mt-3.5">
          Every product below runs on the same layer you just saw.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 mt-12">
          {products.map(({ name, badge, blurb, img, focus, alt, link }) => (
            <div
              key={name}
              className="bg-surface-light border border-surface-border rounded-2xl p-3.5 flex flex-col gap-1.5"
            >
              <div className="text-primary font-extrabold text-[15px] flex items-center gap-2 flex-wrap leading-tight">
                {name}
                {badge && (
                  <span className="text-[9px] font-bold uppercase tracking-wider text-background bg-text-muted rounded px-1.5 py-0.5">
                    {badge}
                  </span>
                )}
              </div>
              <p className="text-text-muted text-xs leading-snug">{blurb}</p>
              <img
                src={img}
                alt={alt}
                loading="lazy"
                className={`w-full aspect-4/5 object-cover ${focus} rounded-lg border border-surface-border mt-auto`}
              />
              {link && (
                <a
                  className="group inline-flex items-center gap-1 text-text font-bold text-xs mt-2 hover:text-primary transition-colors"
                  href={link.href}
                >
                  {link.label}
                  <ArrowUpRight className="w-3.5 h-3.5 text-primary transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </a>
              )}
            </div>
          ))}
        </div>

        <FlowArrows count={5} direction="up" className="hidden lg:flex gap-[18%]" />

        <div className="bg-primary text-background text-center font-black uppercase tracking-[0.18em] text-base py-4.25 px-2.5 rounded-[10px] shadow-[0_0_44px_rgba(250,162,2,0.22)] mt-5 lg:mt-0">
          Alphaday Data Layer
        </div>

        {boards?.length > 0 && (
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <span className="text-sm text-text-muted font-semibold whitespace-nowrap">
              Dashboards live for every major ecosystem:
            </span>
            <div className="flex flex-wrap gap-2.25">
              {boards.map(({ slug, name }) => (
                <a
                  key={slug}
                  href={`/${slug}`}
                  aria-label={`${name} dashboard`}
                  className="group inline-flex items-center gap-1 bg-surface border border-surface-border rounded-lg px-3.5 py-1.75 font-semibold text-[13px] text-text hover:border-primary transition-colors"
                >
                  {name}
                  <ArrowUpRight className="w-3.5 h-3.5 text-primary opacity-70 group-hover:opacity-100 transition-opacity" />
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </Section>
  );
}

export default Products;
