import React, { Children } from "react";


function Title({className, children}) {
  return (
    <h2 className={`text-platinum text-3xl mb-4 md:text-4xl font-medium md:mb-4 ${className}`}>
        {children}
    </h2>
  )
}

export default Title;
