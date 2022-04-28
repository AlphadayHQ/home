import React from "react";

const Div = ({children, className, ...restProps}) => {
    return(
        <div {...restProps} className = {`mx-auto w-11/12 max-w-7xl py-16 ${className}`}>
            { children }
        </div>
    )
}

const Nav = ({children, className, ...restProps}) => {
    return(
        <div {...restProps} className = {`mx-auto w-11/12 max-w-7xl pb-4 pt-8 ${className}`}>
            { children }
        </div>
    )
}


export { Div, Nav };