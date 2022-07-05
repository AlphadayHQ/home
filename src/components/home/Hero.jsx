import React from "react";
import { Button, Section } from "../../shared";
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
  const textOptions = [
    "L2s",
    "NFT",
    "DeFi",
    "Web3",
    "DAOs",
    "Bitcoin",
    "Crypto",
    "Ethereum",
  ];
  return (
    <Section className="bg-california overflow-hidden h-auto w-full border-california">
      <div className="mx-auto w-11/12 max-w-7xl">
        <div className=" md:mx-auto flex flex-col max-w-5xl sm:pt-8 md:pt-16 mt-14">
          <h1 className="flex text-black self-start text-center m-0 md:text-left font-medium leading-[60px] sm:leading-[80px] md:leading-[110px] text-[28px] sm:text-5xl md:text-7xl lg:text-[98px]">
            <span>Everything</span>
            <div className="overflow-hidden relative h-[60px] sm:h-[80px] md:h-[125px] pt-2.5 -mt-2.5 flex">
              <ul className="flip8 max-w-[500px] inline-block">
                {textOptions.map((text) => (
                  <li
                    key={text}
                    className="pl-3 md:pl-6 h-[125px] mb-[15px] flex"
                  >
                    {text}.
                  </li>
                ))}
              </ul>
            </div>
          </h1>
          <h1 className="text-black text-[28px] sm:text-5xl font-medium  m-0 text-left md:text-7xl lg:text-[98px]">
            All in one place.
          </h1>

          <div className="w-full sm:w-[650px] flex flex-col md:flex-row sm:justify-between items-center mt-4 md:mt-8">
            <p className="self-start pt-2.5 w-full text-sm sm:w-[500px] md:text-[19px] leading-6 text-left text-[#000000]">
              The one tool you need to stay up to date and interact with crypto
              with easily customisable workflows.
            </p>
            <Button
              link={"https://app.alphaday.com"}
              className="mt-4 md:mt-0 bg-lightblue self-start md:self-center"
            >
              Launch app
            </Button>
          </div>
          <Dashboard />
        </div>
      </div>
    </Section>
  );
}
