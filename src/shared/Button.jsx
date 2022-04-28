import React from "react";

function Button({ className, link, children, ...restProps }) {
  if (link)
    return (
      <a
        {...restProps}
        href={link}
        className={`${className} cursor-pointer py-2 px-2 md:py-3 md:px-6 rounded-lg text-white drop-shadow-eclipse hover:opacity-80 transition-all duration-300 leading-[24px]`}
      >
        {children}
      </a>
    );
  return (
    <div
      {...restProps}
      className={`${className} cursor-pointer py-2 px-2 md:py-3 md:px-6 rounded-lg text-white drop-shadow-eclipse hover:opacity-80 transition-all duration-300 leading-[24px]`}
    >
      {children}
    </div>
  );
}

export default Button;
