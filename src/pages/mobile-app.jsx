import React from "react";
import { Footer, Navbar } from "../components";
import {
  Hero,
  Partners,
  Backers,
  Team,
  FAQ,
  Getfeatures,
  Workflow,
} from "../components/home";

const MobilePage = () => {
  return (
    <>
      <Navbar />
      <Hero />
      <Workflow />
      <Partners />
      <Backers />
      <Team />
      <FAQ />
      <Getfeatures />
      <Footer />
    </>
  );
};

export default MobilePage;
