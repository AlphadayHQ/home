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
    <a href={href} className={`text-aluminium font-medium text-sm ${className}`}>
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
            <Anchor className="mb-4" href="#">Terms of use</Anchor>
            <Anchor href="#">Privacy policy</Anchor>
          </Col>

          <Col className="">
            <Anchor className="mb-4" href="#">Docs</Anchor>
            <Anchor href="#">Blog</Anchor>
          </Col>

          <Col className="">
            <Anchor className="mb-4" href="#">Contact</Anchor>
            <Anchor href="#">Give feedback</Anchor>
          </Col>

          <div className="flex justify-between items-center w-[90px]"> 
            <figure className="w-[40px] h-[40px] rounded-full bg-black flex justify-center items-center">
              <img src={twitter} alt="twitter"/>
            </figure>
            
            <figure className="w-[40px] h-[40px] rounded-full bg-black flex justify-center items-center">
              <img src={discord} alt="discord"/>
            </figure>
          </div>

        </div>
     </Div>
   </Section>
  )
}

export default Footer;
