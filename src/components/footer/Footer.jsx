import React from "react";
import { Section } from "../../shared";
import alphaday from "../../images/logo.png";
import discordLogo from "../../images/socials/discord.svg";
import twitterLogo from "../../images/socials/twitter.svg";
import linkedinLogo from "../../images/socials/linkedin.svg";
import CONFIG from "../../config";

const ColTitle = ({ children }) => (
  <p className="text-xs font-bold uppercase tracking-[0.12em] text-text-muted mb-3.5">
    {children}
  </p>
);

const Anchor = ({ children, href, target }) => (
  <a
    href={href}
    target={target || "_blank"}
    rel={target === "_self" ? undefined : "noreferrer"}
    className="block text-text-muted text-sm py-1 hover:text-text transition-colors"
  >
    {children}
  </a>
);

function Footer({ isMobile }) {
  const {
    api,
    apiDocs,
    alphadayApp,
    blog,
    blogLinks,
    discord,
    feedBack,
    linkedin,
    pulse,
    recipes,
    privacyPolicy,
    terms,
    twitter,
  } = CONFIG;

  const socials = [
    { href: twitter, img: twitterLogo, label: "X (Twitter)" },
    { href: discord, img: discordLogo, label: "Discord" },
    { href: linkedin, img: linkedinLogo, label: "LinkedIn" },
  ];

  return (
    <Section className="border-t border-surface-border">
      <div
        className={`mx-auto w-11/12 max-w-7xl pb-9 ${isMobile ? "pt-16" : "pt-16"}`}
      >
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-9">
          <div className="col-span-2 md:col-span-3 lg:col-span-1">
            <a href="/" aria-label="Alphaday home">
              <img
                src={alphaday}
                className="h-6.25 object-fit"
                alt="Alphaday"
              />
            </a>
            <p className="text-text-muted text-[13.5px] mt-3 max-w-62.5">
              The crypto data layer for humans, apps, and AI agents.
            </p>
          </div>

          <div>
            <ColTitle>Product</ColTitle>
            <Anchor href={alphadayApp}>Launch app</Anchor>
            <Anchor href={api} target="_self">
              API &amp; MCP
            </Anchor>
            <Anchor href={apiDocs} target="_self">
              Docs
            </Anchor>
            <Anchor href={pulse} target="_self">
              Pulse
            </Anchor>
            <Anchor href={recipes} target="_self">
              Recipes
            </Anchor>
          </div>

          <div>
            <ColTitle>Company</ColTitle>
            <Anchor href={blog}>Blog</Anchor>
            <Anchor href="mailto:hello@alphaday.com">Contact</Anchor>
            <Anchor href={feedBack}>Give Feedback</Anchor>
            <Anchor href={terms}>Terms of Use</Anchor>
            <Anchor href={privacyPolicy} target="_self">
              Privacy Policy
            </Anchor>
          </div>

          <div>
            <ColTitle>Crypto 101</ColTitle>
            {blogLinks["Crypto 101"].map(({ title, link }) => (
              <Anchor key={link} href={link}>
                {title}
              </Anchor>
            ))}
          </div>

          <div>
            <ColTitle>Learn</ColTitle>
            {blogLinks.learn.map(({ title, link }) => (
              <Anchor key={link} href={link}>
                {title}
              </Anchor>
            ))}
          </div>
        </div>

        <div className="mt-12 pt-5.5 border-t border-surface-border flex flex-wrap justify-between items-center gap-3.5">
          <small className="text-text-muted text-[13px]">
            &copy; {new Date().getFullYear()} Alphabox Solutions
          </small>
          <div className="flex gap-3">
            {socials.map(({ href, img, label }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noreferrer"
                aria-label={label}
                className="w-8 h-8 rounded-full bg-surface-light border border-surface-border flex justify-center items-center hover:border-primary/50 transition-colors"
              >
                <img src={img} alt="" className="w-4 h-4" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </Section>
  );
}

export default Footer;
