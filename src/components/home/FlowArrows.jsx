import React from "react";

/**
 * The connector arrows that carry data into (down) or out of (up) the
 * Alphaday Data Layer bar. Gradient runs from border grey at the far end to
 * primary orange at the layer bar, so the colour itself says "this is where
 * the value gets added".
 *
 * Held at 60% opacity: connectors are supporting structure, not accents, and
 * eight saturated arrowheads otherwise compete with the CTA for attention.
 * The gradient still reads clearly at this weight.
 *
 * Pass `delay` (ms) to opt into the hero's entrance choreography: each arrow
 * animates in along its own direction of travel, one after another, so the row
 * reads as flow rather than as a row of icons appearing. Omit it and the
 * arrows render statically — which is what the below-the-fold usages want,
 * since an entrance nobody is present to see is just a pop-in on scroll.
 */
function FlowArrows({
  count = 4,
  direction = "down",
  className = "",
  delay = null,
  stagger = 45,
}) {
  const isDown = direction === "down";
  const gradientId = `flow-${direction}`;
  const animated = delay !== null;

  return (
    <div
      className={`flex justify-center gap-14 py-3.5 opacity-60 ${className}`}
      aria-hidden="true"
    >
      {Array.from({ length: count }, (_, i) => (
        <svg
          key={i}
          width="12"
          height="26"
          viewBox="0 0 12 26"
          fill="none"
          className={animated ? (isDown ? "animate-descend" : "animate-rise") : undefined}
          style={animated ? { animationDelay: `${delay + i * stagger}ms` } : undefined}
        >
          <defs>
            <linearGradient
              id={`${gradientId}-${i}`}
              gradientUnits="userSpaceOnUse"
              x1="6"
              y1="0"
              x2="6"
              y2="26"
            >
              <stop offset="0" stopColor={isDown ? "#3b3a3a" : "#faa202"} />
              <stop offset="1" stopColor={isDown ? "#faa202" : "#3b3a3a"} />
            </linearGradient>
          </defs>
          {isDown ? (
            <>
              <path d="M6 0 V18" stroke={`url(#${gradientId}-${i})`} strokeWidth="2" />
              <path d="M1 17 H11 L6 26 Z" fill="#faa202" />
            </>
          ) : (
            <>
              <path d="M6 8 V26" stroke={`url(#${gradientId}-${i})`} strokeWidth="2" />
              <path d="M1 9 H11 L6 0 Z" fill="#faa202" />
            </>
          )}
        </svg>
      ))}
    </div>
  );
}

export default FlowArrows;
