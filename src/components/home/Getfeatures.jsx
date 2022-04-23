import React from "react";

const Form = () => {
    return(
        <form className="bg-black px-2 md:px-4 py-1 rounded-2xl w-full mx-auto md:w-[550px] flex justofy-between items-center">
            <input
                type="email"
                placeholder="email"
                className="bg-transparent py-4 px-4 w-full outline-0 text-aluminium"
            />
            <button className="bg-blue text-white font-bold py-2 px-4 rounded-xl">Subscribe</button>
        </form>
    )
}

function Getfeatures() {
  return (
    <section className="mx-auto w-11/12 max-w-7xl py-8 bg-california relative top-[-90px] rounded-3xl">
        <div className="px-4 md:px-8 flex flex-col md:flex-row justify-between items-center">
            <div className="mb-8 md:m-0">
                <h3 className="text-black font-bold w-full  max-w-[400px] text-2xl md:text-3xl mb-4">Get informed when we release new features</h3>
                <p className="cursor-pointer rounded border border-[#00000050] w-fit px-2 font-medium text-sm">PREVIOUS NEWSLETTER ISSUES</p>
            </div>

            <div>
                <Form/>
            </div>
        </div>
    </section>
  )
}


export default Getfeatures;
