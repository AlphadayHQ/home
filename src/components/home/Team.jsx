import React from "react";
import { Section, Div, Title } from "../../shared";
import member1 from "../../images/team/member-1.jpg";
import member2 from "../../images/team/member-2.jpg";
import member3 from "../../images/team/member-3.jpg";
import member4 from "../../images/team/member-4.jpg";
import member5 from "../../images/team/member-5.jpg";
import member6 from "../../images/team/member-6.jpg";
import member7 from "../../images/team/member-7.jpg";
import member8 from "../../images/team/member-8.jpg";

const teamData = [
  {
    id: 1,
    img: member1,
    classnames: "rounded-[13px] sm:rounded-[26px] w-[54px] sm:w-[137px]",
    infoPosClassnames:
      "left-[30%] bottom-[-140%] sm:bottom-[-35%] lg:bottom-auto lg:left-[70%]",
    name: "Gideon Anyalewechi",
    position: "Backend Engineer",
    twitter: "https://twitter.com/get_giddy",
    linkedin: "https://www.linkedin.com/in/getgiddy/",
  },
  {
    id: 2,
    img: member2,
    classnames: "rounded-[13px] sm:rounded-[26px] w-[63px]  sm:w-[158px]",
    infoPosClassnames:
      "bottom-[-110%] sm:bottom-[-35%] lg:bottom-auto lg:left-[70%]",
    name: "Defi Dude",
    position: "CO-FOUNDER & CMO",
    twitter: "",
    linkedin: "https://www.linkedin.com/in/defi-dude-72296b221/",
  },
  {
    id: 3,
    img: member3,
    classnames: "rounded-[13px] sm:rounded-[26px] w-[73px] sm:w-[183px]",
    infoPosClassnames:
      "bottom-[-100%] sm:bottom-[-35%] lg:bottom-auto lg:left-[70%]",
    name: "Felipe Faraggi",
    position: "CO-FOUNDER & CTO",
    twitter: "https://twitter.com/felipefaraggi",
    linkedin: "https://www.linkedin.com/in/faraggi/",
  },
  {
    id: 4,
    img: member4,
    classnames: "rounded-[13px] sm:rounded-[26px] w-[60px] sm:w-[151px]",
    infoPosClassnames:
      "right-[30%] bottom-[-120%] sm:bottom-[-35%] lg:bottom-auto lg:left-[70%]",
    name: "Vicente Almonacid",
    position: "Frontend Engineer",
    twitter: "",
    linkedin: "https://www.linkedin.com/in/vicente-almonacid/",
  },
  {
    id: 5,
    img: member5,
    classnames: "rounded-[13px] sm:rounded-[26px] w-[63px]  sm:w-[158px]",
    infoPosClassnames:
      "left-[30%] bottom-[-100%] sm:bottom-[-35%] lg:bottom-auto lg:left-[70%]",
    name: "Pablo Palomo",
    position: "Backend Engineer",
    twitter: "https://twitter.com/ppalomo",
    linkedin: "https://www.linkedin.com/in/pablo-palomo-07127711/",
  },
  {
    id: 6,
    img: member6,
    classnames: "rounded-[13px] sm:rounded-[26px] w-[88px] sm:w-[222px]",
    infoPosClassnames:
      "bottom-[-80%] sm:bottom-[-35%] lg:bottom-auto lg:left-[70%]",
    name: "Deniz Omar",
    position: "CO-FOUNDER & CEO",
    twitter: "https://twitter.com/DenizOmer",
    linkedin: "https://www.linkedin.com/in/denizomer/",
  },
  {
    id: 7,
    img: member7,
    classnames: "rounded-[13px] sm:rounded-[26px] w-[60px] sm:w-[151px]",
    infoPosClassnames:
      "bottom-[-120%] sm:bottom-[-35%] lg:bottom-auto lg:left-[70%]",
    name: "Charles Nwankwo",
    position: "Frontend Engineer",
    twitter: "https://twitter.com/Chadnium",
    linkedin: "https://www.linkedin.com/in/getgiddy/",
  },
  {
    id: 8,
    img: member8,
    classnames: "rounded-[13px] sm:rounded-[26px] w-[54px] sm:w-[137px]",
    infoPosClassnames:
      "right-[30%] bottom-[-140%] sm:bottom-[-35%] lg:bottom-auto lg:left-[70%]",
    name: "Paris Giannakou",
    position: "Content Editor",
    twitter: "https://twitter.com/GrifousG",
    linkedin: "https://www.linkedin.com/in/paris-charanas-giannakou-788386231/",
  },
];

function TeamCard({ data, type }) {
  return (
    <div className={`${type === "bottom" ? "self-start" : "self-end"} group`}>
      <figure className="relative flex justify-center items-center">
        <span className="absolute w-full h-full bg-[#1D1F2090] group-hover:bg-transparent transition-all duration-300"></span>
        <img src={data.img} className={data.classnames} alt={data.name} />

        <div
          className={`scale-0 group-hover:scale-100 transition-all duration-300 rounded-xl absolute z-20 text-white py-2 px-4 bg-black min-w-max ${data.infoPosClassnames}`}
        >
          <div className="mb-4">
            <h4 className="text-[16px]">{data.name}</h4>
            <p className="text-[9.5px] tracking-[.2em] uppercase">
              {data.position}
            </p>
          </div>

          <div className="flex">
            <a className="cursor-pointer flex items-center w-[22px] h-[22px] rounded-full justify-center bg-blue mr-2">
              <i className="text-white text-xs ri-twitter-fill"></i>
            </a>

            <a className="cursor-pointer flex items-center w-[22px] h-[22px] rounded-full justify-center bg-blue">
              <i className="text-white text-xs ri-linkedin-fill"></i>
            </a>
          </div>
        </div>
      </figure>
    </div>
  );
}

function Team() {
  return (
    <Section>
      <Div>
        <div className="">
          <div className="mb-24 w-full flex flex-col items-center">
            {/* <div className="w-[300px]"> */}
            <Title>Our Mission</Title>
            <div className="md:w-[500px]">
              <p className="text-aluminium text-xs md:text-base text-center">
                Crypto has exploded in popularity over the last decade and it is
                now impossible to keep up with this crazy, chaotic space many of
                us call home. We jump from site to site for hours trying to
                track news, follow tweets, look for alpha, and not get rugged.
              </p>

              <p className="text-aluminium text-xs md:text-base mt-4 text-center">
                Alphaday&apos;s mission is to bring you all the tools needed to
                follow your favourite projects, stay up-to-date with the latest
                narratives, and use your favourite dapps, all from the comfort
                of one easy-to-use customizable dashboard.
              </p>
              {/* </div> */}
            </div>
          </div>

          <div className="flex justify-center items-center relative">
            <p
              className="absolute z-10 top-[47%] left-[50%] font-medium text-aluminium text-[22px] tracking-[1px]"
              style={{ transform: "translate(-50%, -50%)" }}
            >
              OUR TEAM
            </p>
            <div className="flex flex-col">
              <div className="flex gap-x-2 justify-center">
                {teamData.slice(0, 4).map((data) => (
                  <TeamCard key={data.id} data={data} type="top" />
                ))}
              </div>
              {/* <p className=" z-10 flex font-medium text-aluminium mt-1 sm:mt-[10px] sm:mb-1 sm:text-[22px] tracking-[1px] self-center">
                OUR TEAM
              </p> */}
              <div className="flex gap-x-2 justify-center items-center">
                {teamData.slice(4, 8).map((data) => (
                  <TeamCard key={data.id} data={data} type="bottom" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </Div>
    </Section>
  );
}

export default Team;
