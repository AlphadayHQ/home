import React from "react";
import { Button } from "../../shared";

const LaunchAppButton = () => {
  return (
    <>
      {/* <Button link={"https://app.alphaday.com"} className={`bg-lightblue`}>
        Launch app
      </Button> */}
      <Button
        disabled
        link={"https://app.alphaday.com"}
        className="mt-4 md:mt-0 bg-[#585858] self-start md:self-center"
      >
        Coming soon
      </Button>
    </>
  );
};

export default LaunchAppButton;
