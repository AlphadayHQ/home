import React from "react";
import { Footer, Navbar } from "../components";
import Hero from "../components/mobile/Hero";
import Video from "../components/mobile/Video";

const MobilePage = () => {
  return (
    <>
      <Navbar />
      <Hero />
      <Video />
      {/* <Workflow />
      <Partners />
      <Backers />
      <Team />
      <FAQ />
      <Getfeatures />
      <Footer /> */}
      <div className="mb-40"></div>
      {/* This is a hack to fix the footer position */}
    </>
  );
};

export default MobilePage;
