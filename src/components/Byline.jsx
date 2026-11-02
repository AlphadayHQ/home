import React from "react";
import { authorForType, authorPath } from "../data/authors";
import { AVATARS } from "./authorAvatars";
import { LINK } from "./PostBody";
import { longDate } from "./dates";

/**
 * Who a research page is bylined to, for its post type, linked to the bio page:
 * the name on one line, the beat and the day it was published under it. A page
 * whose dates say more than that ("Updated ... · 3 updates") passes them as
 * `note` instead. Nothing for a type with no byline. The names are in
 * `data/authors.ts`.
 */
const Byline = ({ type, date = null, note = null }) => {
  const author = authorForType(type);
  if (!author) return null;
  const day = longDate(date);
  return (
    <div className="mt-8 flex items-center gap-3.5">
      <img
        src={AVATARS[author.slug]}
        alt=""
        width="44"
        height="44"
        className="h-11 w-11 shrink-0 rounded-full border border-surface-border"
      />
      <div>
        <a href={authorPath(author.slug)} className={`text-[16px] font-medium text-text ${LINK}`}>
          {author.name}
        </a>
        <p className="mt-0.5 text-[14px] tabular-nums text-text-muted">
          {author.desk}
          {note ? (
            ` · ${note}`
          ) : (
            day && (
              <>
                {" · "}
                <time dateTime={date}>{day}</time>
              </>
            )
          )}
        </p>
      </div>
    </div>
  );
};

export default Byline;
