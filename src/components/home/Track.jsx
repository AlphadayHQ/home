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
import track from "../../images/workflow/track.png";

function Track() {
  const [trackCardToggler, setTrackCardToggler] = useState(false);

  function handleTrackToggler() {
    setTrackCardToggler(!trackCardToggler);
  }

  return (
    <div className="grid grid-cols-1">
      <FlipCard className="overflow-hidden h-[360px] sm:h-[450px] lg:h-[590px]">
        <FlipCardInner className={`${trackCardToggler ? "flipThis" : ""}`}>
          <FlipCardFront>
            <div>
              <CardTitle className="w-full md:w-[570px]">
                Keep track of your portfolio's balances, performance, activity,
                and other metrics for all your wallets in one place
              </CardTitle>
              <FlipCardButton handler={handleTrackToggler}>
                See what you can do
              </FlipCardButton>
            </div>

            <div className="mt-16">
              <figure className="flex justify-center items-center mt-4">
                <img
                  src={track}
                  className="w-[100%] lg:w-[80%] object-fit"
                  alt="track"
                />
              </figure>
            </div>
          </FlipCardFront>

          <FlipCardBack>
            <CardTitle className="w-full max-w-[475px]">
              Track your portfolio position across multiple wallets
            </CardTitle>

            <div className="relative h-[60%] md:h-[65%] lg:h-[70%] xl:h-[75%] flex flex-col justify-between items-start mt-8">
              <CardText className="w-full max-w-[450px]">
              Keep an eye on:
              <br/>
              <br/>
              <ul className=" list-disc list-inside-nested">
                <li>Your portfolio allocation</li>
                <li>Lending and Yield Farming Positions</li>
                <li>Historical performance of tokens</li>
                <li>Token Information including:
                  <ul className=" list-disc list-inside">
                    <li>Volume</li>
                    <li>Market Cap</li>
                    <li>Circulating Supply</li>
                    <li>Max Supply</li>
                    <li>24h High/Low</li>
                  </ul>
                </li>
              </ul>
              </CardText>

              <div className="absolute md:bottom-0 -bottom-6">
                <FlipCardClose handler={handleTrackToggler}>
                  <p className="mr-2">CLOSE</p>
                  <i className="ri-close-fill"></i>
                </FlipCardClose>
              </div>
            </div>
          </FlipCardBack>
        </FlipCardInner>
      </FlipCard>
    </div>
  );
}

export default Track;
