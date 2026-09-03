import React from "react";
import { Footer, Navbar } from "../components";
import { PrivacyPolicy } from "../components/home";
import Seo from "../components/seo";
import CONFIG from "../config";
import { canonicalFor } from "../utils/canonical";

const PrivacyPolicyPage = () => {
  return (
    <>
      <Seo
        title="Privacy Policy — Alphaday"
        description="How Alphaday collects, uses and stores your data."
        canonical={canonicalFor(CONFIG.privacyPolicy)}
      />
      <Navbar isPrivacyPolicy />
      <PrivacyPolicy />
      <Footer />
    </>
  );
};

export default PrivacyPolicyPage;
