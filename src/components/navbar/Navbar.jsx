import React, { useRef, useEffect } from "react";
import { Nav } from "../../shared";
import alphaday from "../../images/logo.png";
import LaunchAppButton from "../home/LaunchAppButton";
import discordLogo from "../../images/socials/discord.svg";
import twitterLogo from "../../images/socials/twitter.svg";
import config from "../../config";

function Navbar() {
  const { twitter, discord } = config;
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
        element?.current?.classList.add("scroll-show");
        element2?.current?.classList.add("scroll-hide");
        element2?.current?.classList.remove("scroll-show");
      }

      if (
        window.pageYOffset < showPosition &&
        element?.current?.classList.contains("scroll-show") &&
        element?.current
      ) {
        element?.current?.classList.remove("scroll-show");
        element?.current?.classList.add("scroll-hide");
        element2?.current?.classList.add("scroll-show");
        element2?.current?.classList.remove("scroll-hide");
      }
    });
  }, []);

  return (
    <div className="bg-california">
      <Nav className="relative z-50 top-0 left-0">
        <div className="flex justify-between items-center">
          <div className="flex justify-between items-center">
            <figure>
              <img
                src={alphaday}
                className="h-[25px] object-fit"
                alt="alphaday"
              />
            </figure>
          </div>

          <div
            className={`fixed w-[91%] z-10 mx-auto lg:max-w-7xl flex justify-end`}
          >
            <div className="relative items-center w-[100px] md:w-[140px] flex justify-end ease-in-out">
              <div
                ref={element2}
                className="scroll-show flex justify-between items-center w-[90px]"
              >
                <a
                  href={discord}
                  target="_blank"
                  className="w-[40px] h-[40px] rounded-full bg-black flex justify-center items-center"
                >
                  <img src={discordLogo} alt="discord" />
                </a>

                <a
                  href="https://twitter.com/AlphadayHQ"
                  target="_blank"
                  className="w-[40px] h-[40px] rounded-full bg-black flex justify-center items-center"
                >
                  <img src={twitterLogo} alt="twitter" />
                </a>
              </div>
              <div ref={element} className="scroll-hide absolute mb-1">
                <LaunchAppButton />
              </div>
            </div>
          </div>
        </div>
      </Nav>
    </div>
  );
}

export default Navbar;
