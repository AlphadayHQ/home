import React from "react"
import { Section, Div, Title } from "../../shared";
import member1 from "../../images/team/member-1.png";
import member2 from "../../images/team/member-2.png";
import member3 from "../../images/team/member-3.png";
import member4 from "../../images/team/member-4.png";
import member5 from "../../images/team/member-5.png";
import member6 from "../../images/team/member-6.png";
import member7 from "../../images/team/member-7.png";

function Team() {
  return (
    <Section>
      <Div>
        <div className="">
          <div className="mb-24">
            <Title>Our Mission</Title>
            <div className="md:w-[500px]">
              <p className="text-aluminium text-xs md:text-sm">
                Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
                eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut
                enim ad minim veniam, quis nostrud exercitation ullamco laboris
                nisi ut aliquip ex ea commodo consequat.
              </p>

              <p className="text-aluminium text-xs md:text-sm mt-4">
                Duis aute irure dolor in reprehenderit in voluptate velit esse
                cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat
                cupidatat non proident, sunt in culpa qui officia deserunt
                mollit anim id est laborum.
              </p>
            </div>
          </div>

          <div className="flex justify-center items-center relative">
            <p
              className="absolute z-10 top-[50%] left-[50%] text-aluminium text-xl"
              style={{ transform: "translate(-50%, -50%)" }}
            >
              OUR TEAM
            </p>
            <div className="">

              <div className="flex gap-x-2">
                
                <div className="self-end group">
                  <figure className="relative flex justify-center items-center">
                    <span className="absolute w-full h-full bg-[#1D1F2090] group-hover:bg-transparent transition-all duration-300"></span>
                    <img src={member1} alt="member1"/>
                  </figure>

                  <div className="scale-0 group-hover:scale-100 transition-all duration-300 rounded-xl absolute z-20 top-[70px] left-0 md:top-[50px] lg:left-[150px] lg:top-[150px] xl:top-[100px] xl:left-[350px] text-white py-2 px-4 bg-black">
                    <div className="mb-4">
                      <h4 className="text-[16px]">DeFi Dude</h4>
                      <p className="text-[10px] tracking-[.2em]">CO-FOUNDER & CMO</p>
                    </div>

                    <div className="flex">
                      <a className="cursor-pointer flex items-center w-[22px] h-[22px] rounded-full justify-center bg-blue mr-2">
                        <i className="text-white text-xs ri-twitter-fill"></i>
                      </a>

                      <a className="cursor-pointer flex items-center w-[22px] h-[22px] rounded-full justify-center bg-blue">
                        <i class="text-white text-xs ri-linkedin-fill"></i>
                      </a>
                    </div>
                  </div>
                </div>

                <div className="self-end group">
                  <figure className="relative flex justify-center items-center">
                    <span className="absolute w-full h-full bg-[#1D1F2090] group-hover:bg-transparent transition-all duration-300"></span>
                    <img src={member2} alt="member2"/>
                  </figure>

                  <div className="scale-0 group-hover:scale-100 transition-all duration-300 rounded-xl absolute z-20 top-[70px] left-[20px] md:top-[100px] md:left-[150px] lg:left-[350px] xl:top-[90px] xl:left-[500px] text-white py-2 px-4 bg-black">
                    <div className="mb-4">
                      <h4 className="text-[16px]">DeFi Dude</h4>
                      <p className="text-[10px] tracking-[.2em]">CO-FOUNDER & CMO</p>
                    </div>

                    <div className="flex">
                      <a className="cursor-pointer flex items-center w-[22px] h-[22px] rounded-full justify-center bg-blue mr-2">
                        <i className="text-white text-xs ri-twitter-fill"></i>
                      </a>

                      <a className="cursor-pointer flex items-center w-[22px] h-[22px] rounded-full justify-center bg-blue">
                        <i class="text-white text-xs ri-linkedin-fill"></i>
                      </a>
                    </div>
                  </div>
                </div>

                <div className="mb-4 group">
                  <figure className="relative flex justify-center items-center">
                    <span className="absolute w-full h-full bg-[#1D1F2090] group-hover:bg-transparent transition-all duration-300"></span>
                    <img src={member3} alt="member3"/>
                  </figure>

                  <div className="scale-0 group-hover:scale-100 transition-all duration-300 rounded-xl absolute z-20 top-[50px] left-[70px] md:left-[400px] md:top-[80px] lg:left-[500px] xl:top-[60px] xl:left-[700px] text-white py-2 px-4 bg-black">
                    <div className="mb-4">
                      <h4 className="text-[16px]">DeFi Dude</h4>
                      <p className="text-[10px] tracking-[.2em]">CO-FOUNDER & CMO</p>
                    </div>

                    <div className="flex">
                      <a className="cursor-pointer flex items-center w-[22px] h-[22px] rounded-full justify-center bg-blue mr-2">
                        <i className="text-white text-xs ri-twitter-fill"></i>
                      </a>

                      <a className="cursor-pointer flex items-center w-[22px] h-[22px] rounded-full justify-center bg-blue">
                        <i class="text-white text-xs ri-linkedin-fill"></i>
                      </a>
                    </div>
                  </div>
                </div>

                <div className="self-end mb-4 group">
                  <figure className="relative flex justify-center items-center">
                    <span className="absolute w-full h-full bg-[#1D1F2090] group-hover:bg-transparent transition-all duration-300"></span>
                    <img src={member4} alt="member4"/>
                  </figure>

                  <div className="scale-0 group-hover:scale-100 transition-all duration-300 rounded-xl absolute z-20 top-[70px] left-[180px] md:left-[500px] md:top-[130px] lg:left-[600px] xl:top-[120px] xl:left-[750px] text-white py-2 px-4 bg-black">
                    <div className="mb-4">
                      <h4 className="text-[16px]">DeFi Dude</h4>
                      <p className="text-[10px] tracking-[.2em]">CO-FOUNDER & CMO</p>
                    </div>

                    <div className="flex">
                      <a className="cursor-pointer flex items-center w-[22px] h-[22px] rounded-full justify-center bg-blue mr-2">
                        <i className="text-white text-xs ri-twitter-fill"></i>
                      </a>

                      <a className="cursor-pointer flex items-center w-[22px] h-[22px] rounded-full justify-center bg-blue">
                        <i class="text-white text-xs ri-linkedin-fill"></i>
                      </a>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-x-2 justify-end items-center">
                <div className="group">
                  <figure className="relative flex justify-center items-center">
                    <span className="absolute w-full h-full bg-[#1D1F2090] group-hover:bg-transparent transition-all duration-300"></span>
                    <img src={member5} alt="member5"/>
                  </figure>

                  <div className="scale-0 group-hover:scale-100 transition-all duration-300 rounded-xl absolute z-20 bottom-[-35px] left-[20px] md:left-[70px] md:bottom-[0px] lg:left-[200px] xl:bottom-[30px] xl:left-[300px] text-white py-2 px-4 bg-black">
                    <div className="mb-4">
                      <h4 className="text-[16px]">DeFi Dude</h4>
                      <p className="text-[10px] tracking-[.2em]">CO-FOUNDER & CMO</p>
                    </div>

                    <div className="flex">
                      <a className="cursor-pointer flex items-center w-[22px] h-[22px] rounded-full justify-center bg-blue mr-2">
                        <i className="text-white text-xs ri-twitter-fill"></i>
                      </a>

                      <a className="cursor-pointer flex items-center w-[22px] h-[22px] rounded-full justify-center bg-blue">
                        <i class="text-white text-xs ri-linkedin-fill"></i>
                      </a>
                    </div>
                  </div>
                </div>

                <div className="group">
                  <figure className="relative flex justify-center items-center">
                    <span className="absolute w-full h-full bg-[#1D1F2090] group-hover:bg-transparent transition-all duration-300"></span>
                    <img src={member6} alt="member6"/>
                  </figure>

                  <div className="scale-0 group-hover:scale-100 transition-all duration-300 rounded-xl absolute z-20 left-[50px] bottom-[-35px] md:left-[300px] md:bottom-[0px] lg:left-[400px] xl:bottom-[0px] xl:left-[550px] text-white py-2 px-4 bg-black">
                    <div className="mb-4">
                      <h4 className="text-[16px]">DeFi Dude</h4>
                      <p className="text-[10px] tracking-[.2em]">CO-FOUNDER & CMO</p>
                    </div>

                    <div className="flex">
                      <a className="cursor-pointer flex items-center w-[22px] h-[22px] rounded-full justify-center bg-blue mr-2">
                        <i className="text-white text-xs ri-twitter-fill"></i>
                      </a>

                      <a className="cursor-pointer flex items-center w-[22px] h-[22px] rounded-full justify-center bg-blue">
                        <i class="text-white text-xs ri-linkedin-fill"></i>
                      </a>
                    </div>
                  </div>
                </div>

                <div className="self-start group">
                  <figure className="relative flex justify-center items-center">
                    <span className="absolute w-full h-full bg-[#1D1F2090] group-hover:bg-transparent transition-all duration-300"></span>
                    <img src={member7} alt="member7"/>
                  </figure>

                  <div className="scale-0 group-hover:scale-100 transition-all duration-300 rounded-xl absolute z-20 left-[150px] bottom-[-25px] md:left-[500px] md:bottom-[20px] lg:left-[600px] xl:bottom-[30px] xl:left-[700px] text-white py-2 px-4 bg-black">
                    <div className="mb-4">
                      <h4 className="text-[16px]">DeFi Dude</h4>
                      <p className="text-[10px] tracking-[.2em]">CO-FOUNDER & CMO</p>
                    </div>

                    <div className="flex">
                      <a className="cursor-pointer flex items-center w-[22px] h-[22px] rounded-full justify-center bg-blue mr-2">
                        <i className="text-white text-xs ri-twitter-fill"></i>
                      </a>

                      <a className="cursor-pointer flex items-center w-[22px] h-[22px] rounded-full justify-center bg-blue">
                        <i class="text-white text-xs ri-linkedin-fill"></i>
                      </a>
                    </div>
                  </div>
                </div>
              </div>
              
            </div>
          </div>
        </div>
      </Div>
    </Section>
  );
}

export default Team;


