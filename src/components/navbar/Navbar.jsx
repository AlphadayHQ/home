import React from 'react'
import { Nav, Button } from "../../shared";
import alphaday from "../../images/alphaday.svg";
import discord from "../../images/socials/discord.svg";
import twitter from "../../images/socials/twitter.svg";

function Navbar() {
  return (
    <div className="bg-california">
      <Nav className="relative z-50 top-0 left-0">
        <div className="flex justify-between items-center">
          <div className="flex justify-between items-center">
            <figure>
              <img src={alphaday} className="w-full" alt="alphaday"/>
            </figure>
          </div>

          <div className="fixed w-[90%] mx-auto lg:max-w-7xl flex justify-end">
            <div className='justify-end md:w-[220px] flex justify-between'>
              <div className="hidden md:flex justify-between items-center w-[90px]"> 
                <figure className="w-[40px] h-[40px] rounded-full bg-black flex justify-center items-center">
                  <img src={twitter} alt="twitter"/>
                </figure>
                
                <figure className="w-[40px] h-[40px] rounded-full bg-black flex justify-center items-center">
                  <img src={discord} alt="discord"/>
                </figure>  
              </div>
              <Button className="bg-blue">Launch app</Button>
            </div>
          </div>
        </div>
      </Nav>
    </div>
  )
}

export default Navbar;
