import React from "react";
import { ArrowRight } from "lucide-react";
import { Layout, Section } from "../shared";
import { authorBySlug } from "../data/authors";
import { AVATARS } from "../components/authorAvatars";
import { LINK } from "../components/PostBody";
import { shortDate } from "../components/dates";

/**
 * A bio page: who covers the beat, then the newest pages under the name. The
 * names are in `data/authors.ts`.
 */
const AuthorPage = ({ page }) => {
  const author = authorBySlug(page.slug);
  const { latest, total } = page;
  const [lede, ...rest] = author.bio;

  return (
    <Layout>
      <Section className="bg-background">
        <div className="mx-auto w-11/12 max-w-5xl pt-24 pb-16">
          <div className="flex items-center gap-6 sm:gap-8">
            <img
              src={AVATARS[author.slug]}
              alt=""
              width="128"
              height="128"
              className="h-20 w-20 shrink-0 rounded-full border border-surface-border sm:h-32 sm:w-32"
            />
            <div>
              <p className="text-[13px] font-medium uppercase tracking-[0.14em] text-text-muted">
                {author.desk} at Alphaday
              </p>
              <h1 className="mt-2 font-display text-[clamp(44px,8vw,80px)] font-medium leading-[0.95] tracking-tight text-text">
                {author.name}
              </h1>
            </div>
          </div>

          <div className="mt-12 max-w-160">
            <p className="text-[clamp(19px,2.2vw,22px)] leading-relaxed text-text">{lede}</p>
            {rest.map((paragraph) => (
              <p key={paragraph} className="mt-5 text-[17px] leading-relaxed text-text-muted">
                {paragraph}
              </p>
            ))}
          </div>
        </div>
      </Section>

      <Section className="bg-background">
        <div className="mx-auto w-11/12 max-w-5xl border-t border-surface-border pt-12 pb-24">
          <div className="flex max-w-160 flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
            <h2 className="font-display text-[26px] font-medium tracking-tight text-text">
              Latest from {author.name}
            </h2>
            <a
              href={author.hub}
              className={`inline-flex items-center gap-1.5 text-[15px] font-medium text-text ${LINK}`}
            >
              {author.hubLabel}
              {total > latest.length && (
                <span className="font-normal tabular-nums text-text-muted">({total})</span>
              )}
              <ArrowRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            </a>
          </div>

          {latest.length === 0 ? (
            <p className="mt-6 text-[17px] text-text-muted">Nothing is published yet.</p>
          ) : (
            <ul className="mt-6 max-w-160 border-t border-surface-border">
              {latest.map((entry) => {
                const day = shortDate(entry.date);
                return (
                  <li
                    key={entry.href}
                    className="flex items-baseline justify-between gap-6 border-b border-surface-border py-4"
                  >
                    <a href={entry.href} className={`text-[17px] font-medium text-text ${LINK}`}>
                      {entry.title}
                    </a>
                    {day && (
                      <span className="shrink-0 whitespace-nowrap text-[14px] tabular-nums text-text-muted">
                        {day}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </Section>
    </Layout>
  );
};

export default AuthorPage;
