import React from "react";

function Button({ className, link, children, ...restProps }) {
  if (link === "link")
    return (
      <a
        {...restProps}
        href={link}
        className={`${className} cursor-pointer py-2 px-2 md:py-2 md:px-4 rounded-lg text-white drop-shadow-eclipse hover:opacity-80 transition-all duration-300`}
      >
        {children}
      </a>
    );
  return (
    <div
      {...restProps}
      className={`${className} cursor-pointer py-2 px-2 md:py-2 md:px-4 rounded-lg text-white drop-shadow-eclipse hover:opacity-80 transition-all duration-300`}
    >
      {children}
    </div>
  );
}

export default Button;
