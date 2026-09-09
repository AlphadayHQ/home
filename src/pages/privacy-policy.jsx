import React from "react";
import { Footer, Navbar } from "../components";
import { PrivacyPolicy } from "../components/home";
import CONFIG from "../config";

const PrivacyPolicyPage = () => {
  return (
    <>
      <Navbar isPrivacyPolicy />
      <PrivacyPolicy />
      <Footer />
    </>
  );
};

export default PrivacyPolicyPage;
