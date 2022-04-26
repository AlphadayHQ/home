import React, {useRef, useEffect} from 'react'
import { Nav, Button } from "../../shared";
import alphaday from "../../images/alphaday.svg";
import discord from "../../images/socials/discord.svg";
import twitter from "../../images/socials/twitter.svg";

function Navbar() {
  
  const showPosition = 500;
  const element = useRef(null);

  useEffect(() => {
    window.addEventListener("scroll", () => {
      if (
        window.pageYOffset > showPosition &&
        !element?.current?.classList.contains("scroll-show") &&
        element?.current
      ) {
        element?.current?.classList.remove("scroll-hide");
        element?.current?.classList.add("scroll-show");
      }

      if (
        window.pageYOffset < showPosition &&
        element?.current?.classList.contains("scroll-show") &&
        element?.current
      ) {
        element?.current?.classList.remove("scroll-show");
        element?.current?.classList.add("scroll-hide");
      }
    });
  }, []);


  // const handleScroll = () => {
  //   setPosition(window.pageYOffset);
  // }

  // console.log(position);

  // useEffect(() => {
  //   window.addEventListener("scroll", handleScroll);

    
  // });

  return (
    <div className="bg-california">
      <Nav className="relative z-50 top-0 left-0">
        <div className="flex justify-between items-center">
          <div className="flex justify-between items-center">
            <figure>
              <img src={alphaday} className="w-full" alt="alphaday"/>
            </figure>
          </div>

         
          <div ref={element} className={`fixed w-[90%] mx-auto lg:max-w-7xl flex justify-end scroll-hide`}>
            <div className='justify-end md:w-[220px] flex justify-between'>
              <div className="hidden md:flex justify-between items-center w-[90px]"> 
                <figure className="w-[40px] h-[40px] rounded-full bg-black flex justify-center items-center">
                  <img src={twitter} alt="twitter"/>
                </figure>
                
                <figure className="w-[40px] h-[40px] rounded-full bg-black flex justify-center items-center">
                  <img src={discord} alt="discord"/>
                </figure>  
              </div>
              <Button className={`bg-blue`}>Launch app</Button>
            </div>
          </div>
          
        </div>
      </Nav>
    </div>
  )
}

export default Navbar;
