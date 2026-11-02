import React from "react";
import { Layout, Section } from "../shared";
import { authorBySlug } from "../data/authors";
import { AVATARS } from "../components/authorAvatars";
import { LINK } from "../components/PostBody";
import { shortDate } from "../components/dates";

/**
 * A bio page: who covers the beat, the rules every page under the name follows,
 * and the newest of those pages. The names are in `data/authors.ts`.
 */
const AuthorPage = ({ page }) => {
  const author = authorBySlug(page.slug);
  const { latest, total } = page;

  return (
    <Layout>
      <Section className="bg-background">
        <div className="mx-auto w-11/12 max-w-5xl pt-24 pb-4">
          <p className="mb-3.5 text-[13px] font-medium uppercase tracking-[0.14em] text-text-muted">
            {author.desk}
          </p>

          <div className="flex items-center gap-6">
            <img
              src={AVATARS[author.slug]}
              alt=""
              width="128"
              height="128"
              className="h-24 w-24 shrink-0 rounded-full border border-surface-border sm:h-32 sm:w-32"
            />
            <h1 className="font-display text-[clamp(40px,7vw,72px)] font-medium leading-[1] tracking-tight text-text">
              {author.name}
            </h1>
          </div>

        </div>
      </Section>

      <Section className="bg-background">
        <div className="mx-auto w-11/12 max-w-5xl pt-8 pb-10">
          <h2 className="font-display text-[26px] font-medium tracking-tight text-text">
            About {author.name}
          </h2>
          <div className="mt-4 flex max-w-160 flex-col gap-4 text-[17px] leading-relaxed text-text-muted">
            {author.bio.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>

          <h2 className="mt-12 font-display text-[26px] font-medium tracking-tight text-text">
            How {author.name} works
          </h2>
          <ul className="mt-4 flex max-w-160 list-disc flex-col gap-2.5 pl-5 text-[17px] leading-relaxed text-text-muted marker:text-surface-border">
            {author.rules.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
          <p className="mt-6 max-w-160 text-[15px] text-text-muted">
            Every page is reviewed by the Alphaday team before it is published, and lists the
            sources it was written from.
          </p>
        </div>
      </Section>

      <Section className="bg-background">
        <div className="mx-auto w-11/12 max-w-5xl border-t border-surface-border pt-10 pb-24">
          <h2 className="font-display text-[26px] font-medium tracking-tight text-text">
            Latest from {author.name}
          </h2>
          {latest.length === 0 ? (
            <p className="mt-4 text-[17px] text-text-muted">Nothing is published yet.</p>
          ) : (
            <ul className="mt-5 flex flex-col gap-3">
              {latest.map((entry) => {
                const day = shortDate(entry.date);
                return (
                  <li
                    key={entry.href}
                    className="flex max-w-160 flex-wrap items-baseline gap-x-3 text-[16px]"
                  >
                    <a href={entry.href} className={`font-medium text-text ${LINK}`}>
                      {entry.title}
                    </a>
                    {day && (
                      <span className="whitespace-nowrap text-[14px] tabular-nums text-text-muted">
                        {day}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          <p className="mt-8 text-[16px]">
            <a href={author.hub} className={`font-medium text-text ${LINK}`}>
              {author.hubLabel}
            </a>
            {total > latest.length && (
              <span className="ml-2 tabular-nums text-text-muted">{total} in all</span>
            )}
          </p>
        </div>
      </Section>
    </Layout>
  );
};

export default AuthorPage;
