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
        className="mt-4 md:mt-0 bg-[#585858] hover:opacity-100 cursor-not-allowed self-start md:self-center"
      >
        Coming soon
      </Button>
    </>
  );
};

export default LaunchAppButton;
