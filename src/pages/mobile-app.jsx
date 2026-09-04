import React from "react";
import { Footer, Navbar } from "../components";
import Seo from "../components/seo";
import CONFIG from "../config";
import { canonicalFor } from "../utils/canonical";
import { buildFaqJsonLd } from "../utils/faqJsonLd";
import { mobileFAQData } from "../components/home/faqData";
import Hero from "../components/mobile/Hero";
import Video from "../components/mobile/Video";
import { Backers, FAQ } from "../components/home";
import Info from "../components/mobile/Info";
import onTheGoImage from "../images/mobile/crypto-on-the-go.webp";
import NotificationsImage from "../images/mobile/alpha-notifications.webp";
import Stats from "../components/home/Stats";
import SuperfeedInfo from "../components/mobile/SuperfeedInfo";
import SomeFeatures from "../components/mobile/SomeFeatures";
// import UserFeedback from "../components/mobile/UserFeedback";
import JoinCommunity from "../components/mobile/JoinCommunity";

const MobilePage = () => {
  return (
    <>
      {/* mobileFAQData, matching the <FAQ isMobile /> rendered below — the home
          page's four questions are a different set, and structured data must
          describe the questions actually in this DOM. */}
      <Seo
        title="Alphaday Mobile — Crypto on the go"
        description="The whole Alphaday workspace in your pocket: news, market data, governance and alerts, with push notifications for the signals you care about."
        canonical={canonicalFor(CONFIG.mobile)}
        jsonLd={buildFaqJsonLd(mobileFAQData)}
      />
      <Navbar />
      <Hero />
      <Video />
      <Info
        emoji="🏃"
        title="Crypto on the go"
        text="Experience the ultimate convenience with Alphaday and fit your entire crypto workflow right in your pocket."
        img={onTheGoImage}
      />
      <Info
        emoji="🔔"
        title="Never miss a beat"
        text="Stay ahead with instant alerts on market trends, coin updates, and tailored notifications."
        img={NotificationsImage}
        bg="bg-eerie"
      />
      <SuperfeedInfo />
      <div className="mx-auto w-11/12 max-w-7xl py-16">
        <Stats />
      </div>
      <SomeFeatures />
      <Backers />
      <JoinCommunity />
      <FAQ isMobile />
      <Footer isMobile />
    </>
  );
};

export default MobilePage;
