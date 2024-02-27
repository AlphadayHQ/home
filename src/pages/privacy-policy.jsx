import React from "react";
import { Footer, Navbar } from "../components";
import { PrivacyPolicy } from "../components/home";

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
