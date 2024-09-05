import React from "react";
import { Section, Div } from "../../shared";
import discordLogo from "../../images/socials/discord.svg";
import twitterLogo from "../../images/socials/twitter.svg";
import linkedinLogo from "../../images/socials/linkedin.svg";
import config from "../../config";

const Col = ({ children, className }) => {
  return <div className={`flex flex-col ${className}`}>{children}</div>;
};

const Anchor = ({ children, href, className, target }) => {
  return (
    <a
      href={href}
      target={target || "_blank"}
      className={`text-aluminium text-sm ${className}`}
    >
      {children}
    </a>
  );
};

const ColTilte = ({ title }) => (
  <p className="text-aluminium text-sm font-medium mb-4">{title}</p>
);

function Footer({ isMobile }) {
  const {
    blog,
    discord,
    feedBack,
    linkedin,
    privacyPolicy,
    terms,
    twitter,
    blogLinks,
  } = config;
  return (
    <Section className="">
      <Div className={isMobile ? "pt-16" : "pt-0"}>
        <div className="grid place-content-between gap-10 xl:gap-16 grid-cols-2 md:grid-cols-4">
          <Col className="place-self-start flex">
            <ColTilte title="About Us" />
            <Anchor className="mb-4" href={terms}>
              Terms of Use
            </Anchor>
            <Anchor target="_self" href={privacyPolicy} className="mb-4">
              Privacy Policy
            </Anchor>
            <Anchor href={blog} className="mb-4">
              Blog
            </Anchor>
            <Anchor href="mailto:hello@alphaday.com" className="mb-4">
              Contact
            </Anchor>
            <Anchor href={feedBack}>Give Feedback</Anchor>
          </Col>

          <Col className="place-self-start flex">
            <ColTilte title="Crypto 101" />
            {blogLinks["Crypto 101"].map(({ title, link }) => (
              <Anchor key={link} href={link} className="mb-4">
                {title}
              </Anchor>
            ))}
          </Col>

          <Col className="place-self-start flex col-span-2 md:col-span-1">
            <ColTilte title="Learn" />
            {blogLinks.learn.map(({ title, link }) => (
              <Anchor key={link} href={link} className="mb-4">
                {title}
              </Anchor>
            ))}
          </Col>

          <div className="place-self-start pb-4 md:place-self-center items-end flex justify-between w-[130px] h-full col-span-2 md:col-span-1">
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
