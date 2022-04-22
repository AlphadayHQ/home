import React from 'react'
import { Nav, Button } from "../../shared";
import alphaday from "../../images/alphaday.svg";
import discord from "../../images/socials/discord.svg";
import twitter from "../../images/socials/twitter.svg";

function Navbar() {
  return (
    <div className="bg-california border border-california">
      <Nav className="relative z-50 top-0 left-0">
        <div className="flex justify-between items-center">
          <div className="flex justify-between items-center w-[70%] md:w-[80%] lg:w-[85%]">
            <figure>
              <img src={alphaday} className="w-full" alt="alphaday"/>
            </figure>

            <div className="hidden md:flex justify-between items-center w-[90px]"> 
              <figure className="w-[40px] h-[40px] rounded-full bg-black flex justify-center items-center">
                <img src={twitter} alt="twitter"/>
              </figure>
              
              <figure className="w-[40px] h-[40px] rounded-full bg-black flex justify-center items-center">
                <img src={discord} alt="discord"/>
              </figure>
            </div>
          </div>

          <div className="fixed w-[90%] mx-auto max-w-7xl flex justify-end">
          <Button className="bg-blue">Launch app</Button>
          </div>
        </div>
      </Nav>
    </div>
  )
}

export default Navbar;
