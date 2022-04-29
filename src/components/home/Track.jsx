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
      <FlipCard className="overflow-hidden h-[350px] sm:h-[400px] lg:h-[590px]">
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
              You can search for specific events, and filter them by category
              and location.
            </CardTitle>

            <div className="relative h-[60%] md:h-[65%] lg:h-[70%] xl:h-[75%] flex flex-col justify-between items-start mt-8">
              <CardText className="w-full max-w-[450px]">
                Our calendar widget lets you stay on top of events, meetups,
                important upgrades, and other notable things happening in the
                future.
                <br />
                <br />
                With the calendar widget you’ll never fall behind on important
                events, meetups and protocol upgrades.
              </CardText>

              <div className="absolute bottom-0">
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
