import React from "react";
import { Section, Div } from "../../shared";
import discordLogo from "../../images/socials/discord.svg";
import twitterLogo from "../../images/socials/twitter.svg";
import linkedinLogo from "../../images/socials/linkedin.svg";
import config from "../../config";

const Col = ({ children, className }) => {
  return <div className={`flex flex-col ${className}`}>{children}</div>;
};

const Anchor = ({ children, href, className }) => {
  return (
    <a
      href={href}
      target="_blank"
      className={`text-aluminium text-sm ${className}`}
    >
      {children}
    </a>
  );
};

function Footer() {
  const { blog, discord, feedBack, linkedin, privacyPolicy, terms, twitter } =
    config;
  return (
    <Section className="">
      <Div className="pt-0">
        <div className="grid place-content-between gap-10 sm:gap-16 grid-cols-2 md:grid-cols-4">
          <Col className="place-self-center hidden md:flex">
            <Anchor className="mb-4" href={terms}>
              Terms of Use
            </Anchor>
            <Anchor href={privacyPolicy}>Privacy Policy</Anchor>
          </Col>

          <Col className="place-self-center hidden md:flex">
            {/* <Anchor className="mb-4" href="#">
              Docs
            </Anchor> */}
            <Anchor href={blog} className="">
              Blog
            </Anchor>
          </Col>

          <Col className="place-self-center hidden md:flex">
            <Anchor href="mailto:hello@alphaday.com" className="mb-4">
              Contact
            </Anchor>
            <Anchor href={feedBack}>Give Feedback</Anchor>
          </Col>

          {/* mobile */}
          <Col className="place-self-center md:hidden">
            <Anchor className="mb-4" href={blog}>
              Blog
            </Anchor>
            <Anchor className="mb-4" href={terms}>
              Terms of Use
            </Anchor>
            <Anchor className="mb-4" href={privacyPolicy}>
              Privacy Policy
            </Anchor>
            <Anchor className="mb-4" href={feedBack}>
              Give Feedback
            </Anchor>
            <Anchor href="mailto:hello@alphaday.com">Contact</Anchor>
          </Col>

          <div className="place-self-center items-end flex justify-between w-[130px] h-full">
            <a target="_blank" href={twitter}>
              <figure className="w-[40px] h-[40px] rounded-full bg-black flex justify-center items-center">
                <img src={twitterLogo} alt="twitter" />
              </figure>
            </a>
            <a target="_blank" href={discord}>
              <figure className="w-[40px] h-[40px] rounded-full bg-black flex justify-center items-center">
                <img src={discordLogo} alt="discord" />
              </figure>
            </a>
            <a target="_blank" href={linkedin}>
              <figure className="w-[40px] h-[40px] rounded-full bg-black flex justify-center items-center">
                <img src={linkedinLogo} alt="linkedin" />
              </figure>
            </a>
          </div>
        </div>

        <div className="w-full flex justify-center items-center text-aluminium border-t border-[#A3A7B380] mt-16">
          <small className="mt-4">&copy; 2024 Alphabox Solutions</small>
        </div>
      </Div>
    </Section>
  );
}

export default Footer;
