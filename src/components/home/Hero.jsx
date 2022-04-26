import React from "react";
import { Button, Div, Section } from "../../shared";
import hero from "../../images/home/hero.png";
import "./textScroller.css";

const Dashboard = () => {
  return (
    <figure className="mt-16 md:mt-24 h-[350px] md:h-[700px] overflow-hidden">
      <img
        className="w-[100%] bg-eerie mx-auto border-[12px] rounded-xl border-eerie"
        src={hero}
        alt="dashboard"
      />
    </figure>
  );
};

export default function () {
  return (
    <Section className="bg-california overflow-hidden h-auto w-full border-t border-california">
      <div className="mx-auto w-11/12 max-w-7xl">
        <div className=" md:mx-auto max-w-5xl pt-16 md:pt-16 mt-14">
          <div>
            <h1 className="text-black text-center m-0 md:text-left font-medium text-[38px] md:text-7xl lg:text-[98px]">
              Everything NFT.
              {/* <div className="scroller">
                            <span>
                                NFT. <br/>
                                DeFi. <br/>
                                Crypto. <br/>
                                Ethereum.
                            </span>
                        </div> */}
            </h1>
            <h1 className="text-black text-[38px] font-medium  m-0 text-center md:text-left md:text-7xl lg:text-[100px]">
              All in one place.
            </h1>
          </div>

          <div className="w-full md:w-[600px] flex flex-col md:flex-row justify-between items-center mt-4 md:mt-8">
            <p className="w-full text-center text-sm md:w-[430px] md:text-lg md:text-left text-[#00000090]">
              The one tool you need to stay up to date in crypto with easily
              customisable workflows.
            </p>
            <Button className="mt-4 md:mt-0 bg-blue">Launch app</Button>
          </div>
          <Dashboard />
        </div>
      </div>
    </Section>
  );
}
