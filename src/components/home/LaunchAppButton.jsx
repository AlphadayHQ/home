import React from "react";
import { Button } from "../../shared";
import config from "../../config";

const LaunchAppButton = () => {
  const { alphadayApp } = config;

  return (
    <>
      <Button
        link={alphadayApp}
        className={`bg-lightblue whitespace-nowrap pt-2.5`}
      >
        Launch app
      </Button>
    </>
  );
};

export default LaunchAppButton;
