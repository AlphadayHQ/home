import React, {useState} from "react";
import { CardText, CardTitle, FlipCard, FlipCardInner, FlipCardFront, FlipCardBack, FlipCardClose, FlipCardButton} from "../../shared/index";
// import searchbg from "../../images/bg-text.png";

function Searchandfilter() {
  return (
    <div className="grid grid-cols-1">
        <FlipCard className="overflow-hidden h-[300px]">
            <FlipCardInner>
                <FlipCardFront className="pt-8 pb-8">
                    <div className="relative h-full w-full md:bg-[url('../../images/bg-text.png')] bg-no-repeat bg-center" >
                        <div>
                            <CardTitle className="w-full md:w-[300px]">
                                Search data and filter by projects
                            </CardTitle>
                            <FlipCardButton>How it works</FlipCardButton>
                        </div>
                    </div>
                </FlipCardFront>

                <FlipCardBack>
                    <p>Back</p>
                </FlipCardBack>
            </FlipCardInner>
        </FlipCard>
    </div>
  )
}

export default Searchandfilter;