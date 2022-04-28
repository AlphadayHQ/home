import React, { useRef, useEffect } from "react";
import { Nav, Button } from "../../shared";
import alphaday from "../../images/alphaday.svg";
import discord from "../../images/socials/discord.svg";
import twitter from "../../images/socials/twitter.svg";

function Navbar() {
  const showPosition = 492;
  const element = useRef(null);
  const element2 = useRef(null);

  useEffect(() => {
    window.addEventListener("scroll", () => {
      if (
        window.pageYOffset > showPosition &&
        !element?.current?.classList.contains("scroll-show") &&
        element?.current
      ) {
        element?.current?.classList.remove("scroll-hide");
        element2?.current?.classList.remove("translate-x-[100px]");
        element2?.current?.classList.add("translate-x-[0px]");
        element?.current?.classList.add("scroll-show");
      }

      if (
        window.pageYOffset < showPosition &&
        element?.current?.classList.contains("scroll-show") &&
        element?.current
      ) {
        element?.current?.classList.remove("scroll-show");
        element?.current?.classList.add("scroll-hide");
        setTimeout(() => {
          element2?.current?.classList.add("translate-x-[100px]");
          element2?.current?.classList.remove("translate-x-[0px]");
        }, 300);
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
              <img
                src={alphaday}
                className="w-[80%] md:w-[100%] object-fit"
                alt="alphaday"
              />
            </figure>
          </div>

          <div
            className={`fixed w-[91%] z-10 mx-auto lg:max-w-7xl flex justify-end`}
          >
            <div
              ref={element2}
              className="items-center w-[200px] md:w-[240px] flex justify-between ease-in-out translate-x-[100px]"
            >
              <div className="flex justify-between items-center w-[90px]">
                <figure className="w-[40px] h-[40px] rounded-full bg-black flex justify-center items-center">
                  <img src={twitter} alt="twitter" />
                </figure>

                <figure className="w-[40px] h-[40px] rounded-full bg-black flex justify-center items-center">
                  <img src={discord} alt="discord" />
                </figure>
              </div>
              <div ref={element} className="scroll-hide">
                <Button link={"https://app.alphaday.com"} className={`bg-blue`}>
                  Launch app
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Nav>
    </div>
  );
}

export default Navbar;
