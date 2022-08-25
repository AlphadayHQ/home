import React from "react";
import { Button } from "../../shared";
import config from "../../config.json";

const LaunchAppButton = () => {
  const { alphadayApp } = config;

  return (
    <>
      <Button link={alphadayApp} target="_blank" className={`bg-lightblue`}>
        Launch app
      </Button>
    </>
  );
};

export default LaunchAppButton;
