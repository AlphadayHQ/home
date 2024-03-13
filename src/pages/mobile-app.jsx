import React from "react";
import { Footer, Navbar } from "../components";
import Hero from "../components/mobile/Hero";
import Video from "../components/mobile/Video";
import { Backers, FAQ, Partners, Workflow } from "../components/home";
import Info from "../components/mobile/Info";
import onTheGoImage from "../images/mobile/on-the-go.png";
import SwipeUpImage from "../images/mobile/swipe-up.png";
import NotificationsImage from "../images/mobile/notifications.png";
import Stats from "../components/home/Stats";
import SuperfeedInfo from "../components/mobile/SuperfeedInfo";
import SomeFeatures from "../components/mobile/SomeFeatures";
import UserFeedback from "../components/mobile/UserFeedback";

const MobilePage = () => {
  return (
    <>
      <Navbar />
      <Hero />
      <Video />
      <Backers />
      <Info
        emoji="🏃"
        title="Crypto on the go"
        text="Experience the ultimate convenience with Alphaday and fit your entire crypto workflow right in your pocket."
        img={onTheGoImage}
      />
      <Info
        emoji="👆"
        title="Swipe up for alpha"
        text="Alphaday is here to change the way you interact with your crypto feed completely."
        img={SwipeUpImage}
        bg="bg-eerie"
      />
      <div className="mx-auto w-11/12 max-w-7xl py-10">
        <Stats />
      </div>
      <SuperfeedInfo />
      <Info
        emoji="🔔"
        title="Never miss a beat"
        text="Stay ahead with instant alerts on market trends, coin updates, and tailored notifications."
        img={NotificationsImage}
        bg="bg-eerie"
      />
      <SomeFeatures />
      <UserFeedback />
      <FAQ isMobile />
      <Footer isMobile />
    </>
  );
};

export default MobilePage;
