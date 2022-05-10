import React, { useState } from "react";
import {
  Card,
  CardText,
  CardTitle,
  FlipCard,
  FlipCardInner,
  FlipCardFront,
  FlipCardBack,
  FlipCardButton,
  FlipCardClose,
} from "../../shared";
import gas from "../../images/workflow/gas.png";
import switchimage from "../../images/workflow/switch.png";

function Gasandoptions() {
  const [gasToggler, setGasToggler] = useState(false);
  const [optionToggler, setOptionToggler] = useState(false);

  function handleGasToggle() {
    setGasToggler(!gasToggler);
  }

  function handleOptionToggle() {
    setOptionToggler(!optionToggler);
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-[.8fr_1fr] gap-8">
      <FlipCard className="overflow-hidden h-[350px] md:h-[450px] lg:h-[490px]">
        <FlipCardInner className={`${gasToggler ? "flipThis" : ""}`}>
          <FlipCardFront>
            <div>
              <CardTitle className="w-full ">Keep an eye on gas fees</CardTitle>
              <FlipCardButton handler={handleGasToggle}>DETAILS</FlipCardButton>
            </div>

            <div className="mt-8 lg:mt-16 md:relative">
              <figure className="absolute left-[-80px] lg:top-[20px] flex justify-center items-center mt-2">
                <img
                  src={gas}
                  className="w-[100%] md:w-[100%] object-fit"
                  alt="gas"
                />
              </figure>
            </div>
          </FlipCardFront>

          <FlipCardBack className="relative">
            <CardTitle className="w-full max-w-[475px]">
              See the latest recommended gas price for Eth1.0 transactions.
            </CardTitle>

            <div className="relative h-[60%] md:h-[65%] lg:h-[70%] xl:h-[75%] flex flex-col justify-between items-start mt-2">
              <CardText className="w-full max-w-[450px]">
                See the recommended transaction gas price for fast, standard,
                and safe low transactions.
              </CardText>
            </div>
            <div className="absolute bottom-10">
              <FlipCardClose handler={handleGasToggle}>
                <p className="mr-2">CLOSE</p>
                <i className="ri-close-fill"></i>
              </FlipCardClose>
            </div>
          </FlipCardBack>
        </FlipCardInner>
      </FlipCard>

      <FlipCard className="overflow-hidden h-[350px] md:h-[450px] lg:h-[490px]">
        <FlipCardInner className={`${optionToggler ? "flipThis" : ""}`}>
          <FlipCardFront>
            <div>
              <CardTitle className="w-full max-w-[550px]">
                1-click switch between different dashboard views and design your
                own
              </CardTitle>
              <FlipCardButton handler={handleOptionToggle}>
                How it works
              </FlipCardButton>
            </div>

            <div className="mt-16 lg:mt-24">
              <figure className="flex justify-center items-center">
                <img
                  src={switchimage}
                  className="w-[100%] lg:w-[80%]"
                  alt="switch"
                />
              </figure>
            </div>
          </FlipCardFront>

          <FlipCardBack className="relative">
            <CardTitle className="w-full max-w-[475px]">
              Your Dashboard Personalised
            </CardTitle>

            <div className="relative h-[60%] md:h-[65%] lg:h-[70%] xl:h-[75%] flex flex-col justify-between items-start mt-2">
              <CardText className="w-full max-w-[450px]">
                Create your own dashboards according to your own workflow.
                <br />
                <br />
                Save your 'view' and quickly switch between your various
                pre-saved views.
              </CardText>
            </div>
            <div className="absolute bottom-10">
              <FlipCardClose handler={handleOptionToggle}>
                <p className="mr-2">CLOSE</p>
                <i className="ri-close-fill"></i>
              </FlipCardClose>
            </div>
          </FlipCardBack>
        </FlipCardInner>
      </FlipCard>
    </div>
  );
}

export default Gasandoptions;
