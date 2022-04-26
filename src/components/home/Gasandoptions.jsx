import React from "react";
import { Card, CardText, CardTitle } from "../../shared";
import gas from "../../images/workflow/gas.png";
import switchimage from "../../images/workflow/switch.png";

function Gasandoptions() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-[.65fr_1fr] gap-8">
      <Card className="overflow-hidden h-[350px] lg:h-[490px]">
        <div>
          <CardTitle className="w-full ">Keep an eye on gas fees</CardTitle>
          <CardText>DETAILS</CardText>
        </div>

        <div className="mt-8 lg:mt-16 relative">
          <figure className="absolute left-[-80px] lg:top-[20px] flex justify-center items-center mt-4">
            <img
              src={gas}
              className="w-[80%] md:w-[100%] object-fit"
              alt="gas"
            />
          </figure>
        </div>
      </Card>

      <Card className="overflow-hidden h-[350px] lg:h-[490px]">
        <div>
          <CardTitle className="w-full max-w-[550px]">
            1-click switch between different dashboard views and design your own
          </CardTitle>
          <CardText>How it works</CardText>
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
      </Card>
    </div>
  );
}

export default Gasandoptions;
