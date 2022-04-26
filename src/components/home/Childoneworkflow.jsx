import React, {useState} from "react";
import { Card, CardText, CardTitle, FlipCard, FlipCardInner, FlipCardFront, FlipCardBack, FlipCardButton, FlipCardClose } from "../../shared";
import calendar from "../../images/workflow/calendar.png";
import market from "../../images/workflow/market.png";

function ChildOneWorkflow() {
  const [card1Toggler, setCard1Toggler] = useState(false);
  const [card2Toggler, setCard2Toggler] = useState(false);

  function handlecard1Toggle(){
    setCard1Toggler(!card1Toggler);
  }

  function handlecard2Toggle(){
    setCard2Toggler(!card2Toggler);
  }
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

      <FlipCard className="overflow-hidden h-[450px] lg:h-[590px]">
        <FlipCardInner className={`${card1Toggler ? "flipThis" : ""}`}>
          <FlipCardFront>
            <div>
              <CardTitle className="w-full md:w-[300px]">
                Track important events
              </CardTitle>
              <FlipCardButton handler={handlecard1Toggle}>See What's Inside</FlipCardButton>
            </div>

            <div className="mt-24">
              <div className="mx-auto max-w-fit w-full text-sm mt-8">
                <small className="text-[#E2E3E9] mr-4 tracking-[.1em]">
                  CALENDER
                </small>
                <small className="text-[#E2E3E980] tracking-[.1em]">
                  LIST
                </small>
              </div>
              <figure className="flex justify-center items-center mt-8">
                <img
                  src={calendar}
                  className="w-[100%] lg:w-[80%] object-fit"
                  alt="calendar"
                />
              </figure>
            </div>
          </FlipCardFront>

          <FlipCardBack>
            
            <CardTitle className="w-full max-w-[475px]">
              You can search for specific events, and filter them by category and location.
            </CardTitle>
          
            <div className="relative h-[60%] md:h-[65%] lg:h-[70%] xl:h-[75%] flex flex-col justify-between items-start mt-8">
              <CardText className="w-full max-w-[450px]">
                Our calendar widget lets you stay on top of events, meetups, important upgrades, and other notable things happening in the future.
                <br/><br/>
                With the calendar widget you’ll never fall behind on important events, meetups and protocol upgrades.
              </CardText>
              
              <div className="absolute bottom-0">
                <FlipCardClose handler={handlecard1Toggle}>
                  <p className="mr-2">CLOSE</p>
                  <i className="ri-close-fill"></i>
                </FlipCardClose>
              </div>
            </div>
            
          </FlipCardBack>
        </FlipCardInner>
      </FlipCard>

      <FlipCard className="overflow-hidden h-[450px] lg:h-[590px]">
        <FlipCardInner className={`${card2Toggler ? "flipThis" : ""}`}>
          <FlipCardFront>
            <div>
              <CardTitle className="w-[200px]">Stay on top of markets </CardTitle>
              <FlipCardButton handler={handlecard2Toggle}>List of market widgets</FlipCardButton>
            </div>

            <div className="mt-8">
              <figure className="flex justify-center items-center">
                <img src={market} className="w-[100%] lg:w-[80%]" alt="market" />
              </figure>
            </div>
          </FlipCardFront>

          <FlipCardBack>
            <CardTitle className="w-full max-w-[475px]">
              You can search for specific events, and filter them by category and location.
            </CardTitle>
          
            <div className="relative h-[60%] md:h-[65%] lg:h-[70%] xl:h-[75%] flex flex-col justify-between items-start mt-8">
              <CardText className="w-full max-w-[450px]">
                Our calendar widget lets you stay on top of events, meetups, important upgrades, and other notable things happening in the future.
                <br/><br/>
                With the calendar widget you’ll never fall behind on important events, meetups and protocol upgrades.
              </CardText>
              
              <div className="absolute bottom-0">
                <FlipCardClose handler={handlecard2Toggle}>
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

export default ChildOneWorkflow;
