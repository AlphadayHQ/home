import React from "react";
import { twMerge } from "tailwind-merge";

const Tooltip = ({
  text,
  className,
  tipPos = center, // "right" | "left" | "center"
}) => {
  return (
    <div
      class={twMerge(
        "[transform:perspective(50px)_translateZ(0)_rotateX(10deg)] peer-hover:[transform:perspective(0px)_translateZ(0)_rotateX(0deg)] absolute bottom-0 mb-6 origin-bottom rounded text-white opacity-0 transition-all duration-300 peer-hover:opacity-100",
        className
      )}
    >
      <div
        class={twMerge(
          "flex max-w-xs flex-col items-center",

          tipPos === "right" && "items-end"
        )}
      >
        <div
          class={twMerge(
            "[clip-path:polygon(100%_50%,_0_0,_100%_0,_50%_100%,_0_0)] rotate-180 h-2 w-4 bg-black",
            tipPos === "right" && "items-end mr-2"
          )}
        ></div>
        <div class="rounded font-extralight bg-black px-4 py-3 text-xs text-left shadow-lg cursor-default">
          {text}
        </div>
      </div>
    </div>
  );
};

export default Tooltip;
