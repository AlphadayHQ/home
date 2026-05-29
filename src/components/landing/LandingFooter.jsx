import React from "react";
import { Section, Div } from "../../shared";
import discordLogo from "../../images/socials/discord.svg";
import twitterLogo from "../../images/socials/twitter.svg";
import alphadayLogo from "../../images/logo.png";
import config from "../../config";

function LandingFooter() {
  const { twitter, discord } = config;
  return (
    <Section className="bg-shark border-t border-white/5">
      <Div className="!py-10 flex flex-col md:flex-row items-center justify-between gap-6">
        <a
          href="https://alphaday.com"
          className="flex items-center gap-2 text-aluminium text-sm"
        >
          <img src={alphadayLogo} alt="Alphaday" className="h-5" />
          <span>Powered by Alphaday</span>
        </a>
        <div className="flex items-center gap-3">
          <a
            href={twitter}
            target="_blank"
            rel="noreferrer"
            className="w-10 h-10 rounded-full bg-black flex justify-center items-center"
          >
            <img src={twitterLogo} alt="Twitter" />
          </a>
          <a
            href={discord}
            target="_blank"
            rel="noreferrer"
            className="w-10 h-10 rounded-full bg-black flex justify-center items-center"
          >
            <img src={discordLogo} alt="Discord" />
          </a>
        </div>
      </Div>
    </Section>
  );
}

export default LandingFooter;
