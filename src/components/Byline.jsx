import React from "react";
import { authorForType, authorPath } from "../data/authors";
import { AVATARS } from "./authorAvatars";
import { LINK } from "./PostBody";

/**
 * Who a research page is bylined to, for its post type, linked to the bio page.
 * Nothing for a type with no byline. The names are in `data/authors.ts`.
 */
const Byline = ({ type }) => {
  const author = authorForType(type);
  if (!author) return null;
  return (
    <p className="mt-6 flex items-center gap-3 text-[15px] text-text-muted">
      <img
        src={AVATARS[author.slug]}
        alt=""
        width="40"
        height="40"
        className="h-10 w-10 shrink-0 rounded-full border border-surface-border"
      />
      <span>
        By{" "}
        <a href={authorPath(author.slug)} className={`font-medium text-text ${LINK}`}>
          {author.name}
        </a>
        <span> · {author.desk}</span>
      </span>
    </p>
  );
};

export default Byline;
