import React, { useState } from "react";
import {
  CardText,
  CardTitle,
  FlipCard,
  FlipCardInner,
  FlipCardFront,
  FlipCardButton,
  FlipCardClose,
  FlipCardBack,
} from "../../shared";

const data = {
  widgets: [
    "News",
    "Calendar",
    "Portfolio",
    "Price Chart",
    "Twitter Feed",
    "Gas Price",
    "DAO Tracker",
    "NFT Research Reports",
    "Total Value Locked",
    "Trending NFTs",
    "Daily Gwei Video Feed",
    "Top Exchanges",
    "Beginner Courses",
    "Podcasts",
    "and more"
  ],
  projects: [
    "Aave",
    "Compound",
    "Curve",
    "Uniswap",
    "Quickswap",
    "MakerDAO",
    "Instadapp",
    "SushiSwap",
    "Balancer",
    "Yearn",
    "Frax",
    "Venus",
    "Osmosis",
    "KyberSwap",
    "0x",
    "1inch",
    "Convex",
    "Anchor",
  ],
  sources: {
    news: ["Coindesk", "Cointelegraph", "EthNews", "Decrypt", "The Defiant", "CryptoSlate", "NewsBTC", "Coin Journal"],
    daos: ["Uniswap", "Curve", "Yearn", "dYdX", "ENS", "Bankless", "Sushi", "BadgerDAO", "Gitcoin", "Compound +25 DAOs"],
    blockchains: ["Ethereum", "Bitcoin", "Polkadot", "Solana", "Near", "Avalanche", "Terra", "Algorand +60 Blockchains"],
  },
};

function Stats() {
  const [statsCardToggler, setStatsCardToggler] = useState(false);

  function handleStatsToggler() {
    setStatsCardToggler(!statsCardToggler);
  }

  const Item = ({ text, className, count }) => (
    <div
      className={`flex justify-start items-start w-[275px] sm:w-[305px] mb-2 md:mb-0 ${className}`}
    >
      <h2
        className={`h-16 text-left md:text-left md:h-20 w-[100px] md:w-auto self-center sm:self-end lg:self-start text-4xl lg:text-7xl font-bold xl:mr-0 pt-2`}
      >
        {count}
      </h2>
      <div className="w-[180px] sm:w-[210px] md:w-auto ml-1 md:ml-2.5 xl:ml-[17px] font-medium">
        <p className="h-16 md:h-20 flex items-center mb-3 text-lg lg:text-xl">
          {text}
        </p>
      </div>
    </div>
  );

  const Title = ({ text }) => (
    <p className="text-lg pb-1 font-medium">{text}</p>
  );

  return (
    <FlipCard className="h-[350px] sm:h-[350px] md:h-[290px] lg:h-[270px]">
      <FlipCardInner
        className={`bg-california rounded-xl ${
          statsCardToggler ? "flipThis" : ""
        }`}
      >
        <FlipCardFront
          className={`bg-california pt-4 md:pt-6 lg:pt-14 px-4 sm:px-8 xl:px-20`}
        >
          <div
            className={`mx-auto ml-3 sm:ml-0 flex flex-col md:flex-row justify-between items-center md:items-start flex-1 mt-4 sm:mt-0`}
          >
            <Item
              count="30+"
              text="widgets"
              className="md:w-auto lg:w-[220px] md:mr-6"
            />

            <Item
              count="500+"
              text="projects"
              className="md:w-auto lg:w-[280px] md:mr-6"
            />

            <Item
              count="200+"
              text="sources of data and information"
              className="lg:w-[360px]"
            />
          </div>
          <div className="flex ml-3 sm:ml-0 justify-center mt-4 lg:mt-6">
            <FlipCardButton
              handler={handleStatsToggler}
              className="text-black border-black ml-5 sm:ml-0"
            >
              See Full List
            </FlipCardButton>
          </div>
        </FlipCardFront>

        <FlipCardBack
          className={`bg-california flex items-center pt-4 md:pt-6 lg:pt-8 pb-4 md:pb-8 px-4 sm:px-8 xl:px-16 overflow-y-scroll no-scrollbar`}
        >
          <div className="grid sm:grid-cols-3 gap-4 align-items-center text-sm lg:text-base h-full">
            <div className="sm:border-r border-black pr-2">
              <Title text={"Add 30+ widgets to your dashboard"} />
              <p className="flex flex-wrap text-sm">
                {data.widgets.map((widget, i) =>
                  i === data.widgets.length - 1 ? widget + "." : widget + ", "
                )}{" "}
              </p>
            </div>
            <div className="flex flex-col justify-between sm:border-r border-black pr-2">
              <div>
                <Title text={"Stay up to date on 500+ projects"} />
                <p className="flex flex-wrap text-sm">
                  {data.projects.map((project, i) =>
                    i === data.projects.length - 1
                      ? project + "."
                      : project + ", "
                  )}
                </p>
              </div>
              <div className="hidden sm:flex flex-col ml-3 sm:ml-0 items-center mt-4 lg:mt-6">
                <FlipCardClose
                  handler={handleStatsToggler}
                  className="text-black border-black py-0.5 pb-[1px] ml-5 sm:ml-0"
                >
                  <p className="mr-2 leading-4">CLOSE</p>
                  <i className="ri-close-fill"></i>
                </FlipCardClose>
                {/* <br className="h-4" /> */}
              </div>
            </div>
            <div>
              <div className="">
                <Title text={"Sources"} />
                <p className="inline-block text-[#2e2516] flex-wrap text-sm">
                  <span className="text-black">News:</span>{" "}
                  {data.sources.news.map((source, i) =>
                    i === data.sources.news.length - 1
                      ? source + "."
                      : source + ", "
                  )}{" "}
                </p>
                <p className="inline-block text-[#2e2516] flex-wrap text-sm">
                  <span className="text-black">DAOs:</span>{" "}
                  {data.sources.daos.map((source, i) =>
                    i === data.sources.daos.length - 1
                      ? source + "."
                      : source + ", "
                  )}{" "}
                </p>
                <p className="inline-block text-[#2e2516]  flex-wrap text-sm">
                  <span className="text-black">Blockchains:</span>{" "}
                  {data.sources.blockchains.map((source, i) =>
                    i === data.sources.blockchains.length - 1
                      ? source + "."
                      : source + ", "
                  )}{" "}
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:hidden items-center mt-3 sm:mt-4 lg:mt-6">
              <FlipCardClose
                handler={handleStatsToggler}
                className="text-black border-black py-0.5 pb-[1px]"
              >
                <p className="mr-2 leading-4">CLOSE</p>
                <i className="ri-close-fill"></i>
              </FlipCardClose>
              <br />
            </div>
          </div>
        </FlipCardBack>
      </FlipCardInner>
    </FlipCard>
  );
}

export default Stats;
