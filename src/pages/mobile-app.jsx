import React from "react";
import { Footer, Navbar } from "../components";
import Hero from "../components/mobile/Hero";
import Video from "../components/mobile/Video";
import { Backers, FAQ } from "../components/home";
import Info from "../components/mobile/Info";
// import onTheGoImage from "../images/mobile/on-the-go.jpg";
import NotificationsImage from "../images/mobile/alpha-notifications.png";
import Stats from "../components/home/Stats";
import SuperfeedInfo from "../components/mobile/SuperfeedInfo";
import SomeFeatures from "../components/mobile/SomeFeatures";
// import UserFeedback from "../components/mobile/UserFeedback";
import JoinCommunity from "../components/mobile/JoinCommunity";

const MobilePage = () => {
  return (
    <>
      <Navbar />
      <Hero />
      <Video />
      <Info
        emoji="🏃"
        title="Crypto on the go"
        text="Experience the ultimate convenience with Alphaday and fit your entire crypto workflow right in your pocket."
        // img={onTheGoImage}
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
