import React from "react";
import { Button, Div, Section } from "../../shared";
import hero from "../../images/home/hero.png";

const Dashboard = () => {
    return(
        <figure className="mt-16 md:mt-24 h-[350px] md:h-[700px] overflow-hidden">
            <img 
                className="w-[100%] bg-eerie mx-auto border-[20px] rounded-xl border-eerie"
                src={hero} 
                alt="dashboard" 
            />
        </figure>
    )
}


export default function () {
  return (
    <Section className="bg-california overflow-hidden h-auto w-full">
        <div className="mx-auto w-11/12 max-w-7xl">
            <div className=" md:mx-auto max-w-5xl pt-32 md:pt-32">
                <div>
                    <h1 className="text-black text-center m-0 md:text-left text-4xl md:text-7xl lg:text-8xl font-bold mt-[-10px]">
                        <span>Everything NFT.</span>
                        {/* <div className="h-[65px] w-fit relative border pt-4 mt-[-60px] right-[-380px] overflow-hidden">
                            <ul className="animate-textFade flex flex-col">
                                <li className="h-[45px] mb-2 block">NFT.</li>
                                <li className="h-[45px] mb-2 block">DeFi.</li>
                                <li className="h-[45px] mb-2 block">Crypto.</li>
                                <li className="h-[45px] mb-2 block">Etherum</li>
                            </ul>
                        </div> */}
                    </h1>
                    <h1 className="text-black text-4xl m-0 text-center md:text-left md:text-7xl lg:text-8xl font-bold">All in one place.</h1>
                </div>

                <div className="w-full md:w-[550px] flex flex-col md:flex-row justify-between items-center mt-4 md:mt-8">
                    <p className="w-full text-center text-sm md:w-[430px] md:text-lg md:text-left font-medium text-[#00000090]">
                        The one tool you need to stay up to date in crypto with easily customisable workflows.
                    </p>
                    <Button className="mt-4 md:mt-0 bg-blue">Launch app</Button>
                </div>
                <Dashboard/>
            </div>
        </div>
    </Section>
  )
}
