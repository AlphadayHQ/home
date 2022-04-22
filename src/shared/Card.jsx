import React from "react";

function Card({className, children}){
    return(
        <div className={`bg-black rounded-2xl px-8 pt-8 pb-0 ${className}`}>
            {children}
        </div>
    )
}


function CardTitle({className, children}) {
  return(
    <h3 className={`text-white mb-4 text-xl md:text-3xl font-bold ${className}`}>
        {children}
    </h3>
  )
}

function CardText({children}) {
    return(
        <p className="border border-aluminium text-sm text-aluminium w-fit px-2 rounded-md">
            {children}
        </p>
    )
}

export {Card, CardTitle, CardText};
