import React from "react";
import { Card, CardText, CardTitle } from '../../shared';
import calendar from "../../images/workflow/calendar.png";
import market from "../../images/workflow/market.png";

function ChildOneWorkflow(){
    return(
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="overflow-hidden h-[450px] lg:h-[590px]">
                <div>
                    <CardTitle className="w-full md:w-[300px]">Don't miss important crypto events</CardTitle>
                    <CardText>WHAT'S INSIDE</CardText>
                </div>

                <div className="mt-16">
                    <div className="mx-auto max-w-fit w-full text-sm">
                        <small className="text-[#E2E3E9] mr-4 font-bold tracking-[.1em]">CALENDER</small>
                        <small className="text-[#E2E3E980] font-bold tracking-[.1em]">LIST</small>    
                    </div>
                    <figure className="flex justify-center items-center mt-4">
                        <img src={calendar} className="w-[100%] lg:w-[80%] object-fit" alt="calendar"/>
                    </figure>
                </div>
            </Card>

            <Card className="overflow-hidden h-[450px] lg:h-[590px]">
                <div>
                    <CardTitle className="w-[200px]">Stay on top of the market</CardTitle>
                    <CardText>List of market widgets</CardText>
                </div>

                <div className="mt-8">
                    <figure className="flex justify-center items-center">
                        <img src={market} className="w-[100%] lg:w-[80%]" alt="market"/>
                    </figure>
                    
                </div>
            </Card>
        </div>
    )
}

export default ChildOneWorkflow;
