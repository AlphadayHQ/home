import React from "react"
import { Section, Div } from "../../shared";
import discord from "../../images/socials/discord.svg";
import twitter from "../../images/socials/twitter.svg";

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
  return (
    <Section className="">
      <Div className="pt-0">
        <div className="grid place-content-between gap-16 grid-cols-2 md:grid-cols-4">
          <Col className="">
            <Anchor className="mb-4" href="#">
              Terms of use
            </Anchor>
            <Anchor href="#">Privacy policy</Anchor>
          </Col>

          <Col className="place-self-center">
            <Anchor className="mb-4" href="#">
              Docs
            </Anchor>
            <Anchor href="#">Blog</Anchor>
          </Col>

          <Col className="md:place-self-center">
            <Anchor href="mailto:hello@alphaday.com" className="mb-4">
              Contact
            </Anchor>
            <Anchor href="https://forms.gle/hBXWWTAvsN7dAMN66">Give feedback</Anchor>
          </Col>

          <div className="place-self-end flex justify-between items-center w-[90px]">
            <a href="https://alphaday.com/discord">
              <figure className="w-[40px] h-[40px] rounded-full bg-black flex justify-center items-center">
                <img src={twitter} alt="twitter" />
              </figure>
            </a>
            <a href="https://twitter.com/AlphadayHQ">
              <figure className="w-[40px] h-[40px] rounded-full bg-black flex justify-center items-center">
                <img src={discord} alt="discord" />
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
