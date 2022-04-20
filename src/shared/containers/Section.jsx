import React from 'react';

const Section = ({children, className, ...restProps}) => {
    return(
        <section {...restProps} className={`${className}`}>
            { children }
        </section>
    )
}

export { Section }
