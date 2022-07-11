import React from "react"
import { Section, Div } from "../../shared";
import discordLogo from "../../images/socials/discord.svg";
import twitterLogo from "../../images/socials/twitter.svg";
import config from "../../config.json"

const Col = ({children, className}) => {
  return(
    <div className={`flex flex-col ${className}`}>
      {children}
    </div>
  )
}

const Anchor = ({children, href, className}) => {
  return(
    <a href={href} className={`text-aluminium text-sm ${className}`}>
      {children}
    </a>
  )
}

function Footer() {
  const { privacyPolicy, terms, twitter, discord, feedBack } = config;
  return (
    <Section className="">
      <Div className="pt-0">
        <div className="grid place-content-between gap-16 grid-cols-2 md:grid-cols-3">
          <Col className="">
            <Anchor className="mb-4" href={terms}>
              Terms of use
            </Anchor>
            <Anchor href={privacyPolicy}>Privacy policy</Anchor>
          </Col>

          {/* <Col className="place-self-center">
            <Anchor className="mb-4" href="#">
              Docs
            </Anchor>
            <Anchor href="#">Blog</Anchor>
          </Col> */}

          <Col className="md:place-self-center">
            <Anchor href="mailto:hello@alphaday.com" className="mb-4">
              Contact
            </Anchor>
            <Anchor href={feedBack}>Give feedback</Anchor>
          </Col>

          <div className="place-self-start md:place-self-end flex justify-between items-center w-[90px]">
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
          </div>
        </div>

        <div className="w-full flex justify-center items-center text-aluminium border-t border-[#A3A7B380] mt-16">
          <small className="mt-4">&copy; 2022 Alphabox Solutions</small>
        </div>
      </Div>
    </Section>
  );
}

export default Footer;
