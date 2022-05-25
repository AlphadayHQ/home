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
import member9 from "../../images/team/member-9.jpg";
import member10 from "../../images/team/member-10.jpg";

const teamData = [
  {
    id: 1,
    img: member1,
    classnames: "rounded-[13px] sm:rounded-[26px] w-[63px]  sm:w-[158px]",
    infoPosClassnames:
      "left-[30%] bottom-[-140%] sm:bottom-[-35%] lg:bottom-auto lg:left-[70%]",
    name: "Gideon Anyalewechi",
    position: "Developer",
    twitter: "https://twitter.com/get_giddy",
    linkedin: "https://www.linkedin.com/in/getgiddy/",
  },
  {
    id: 2,
    img: member2,
    classnames: "rounded-[13px] sm:rounded-[26px] w-[60px] sm:w-[151px]",
    infoPosClassnames:
      "bottom-[-110%] sm:bottom-[-35%] lg:bottom-auto lg:left-[70%]",
    name: "Defi Dude",
    position: "Co-Founder",
    twitter: "https://twitter.com/defidude",
    linkedin: "https://www.linkedin.com/in/defi-dude-72296b221/",
  },
  {
    id: 3,
    img: member3,
    classnames: "rounded-[13px] sm:rounded-[26px] w-[73px] sm:w-[183px]",
    infoPosClassnames:
      "bottom-[-100%] sm:bottom-[-35%] lg:bottom-auto lg:left-[70%]",
    name: "Felipe Faraggi",
    position: "Co-Founder & CTO",
    twitter: "https://twitter.com/felipefaraggi",
    linkedin: "https://www.linkedin.com/in/faraggi/",
  },
  {
    id: 4,
    img: member4,
    classnames: "rounded-[13px] sm:rounded-[26px] w-[60px] sm:w-[151px]",
    infoPosClassnames:
      "bottom-[-120%] sm:bottom-[-35%] lg:bottom-auto lg:left-[70%]",
    name: "Vicente Almonacid",
    position: "Software Engineer",
    twitter: "https://twitter.com/v_almonacid",
    linkedin: "https://www.linkedin.com/in/vicente-almonacid/",
  },
  {
    id: 5,
    img: member5,
    classnames: "rounded-[13px] sm:rounded-[26px] w-[63px]  sm:w-[158px]",
    infoPosClassnames:
      "right-[30%] bottom-[-140%] sm:bottom-[-15%] lg:bottom-auto lg:left-[70%]",
    name: "Pablo Palomo",
    position: "Technical Lead",
    twitter: "https://twitter.com/ppalomo",
    linkedin: "https://www.linkedin.com/in/pablo-palomo-07127711/",
  },
  {
    id: 6,
    img: member9,
    classnames: "rounded-[13px] sm:rounded-[26px] w-[63px]  sm:w-[158px]",
    infoPosClassnames:
      "left-[30%] bottom-[-100%] sm:bottom-[-35%] lg:bottom-auto lg:left-[70%]",
    name: "Jonathan Irhodia",
    position: "Developer",
    twitter: "https://twitter.com/iamelcharitas",
    linkedin: "https://linkedin.com/in/elcharitas",
  },
  {
    id: 7,
    img: member10,
    classnames: "rounded-[13px] sm:rounded-[26px] w-[60px] sm:w-[151px]",
    infoPosClassnames:
      "bottom-[-120%] sm:bottom-[-35%] lg:bottom-auto lg:left-[70%]",
    name: "Mikael Hagopian",
    position: "QA and Analyst",
    twitter: "https://twitter.com/MikeJa33",
    linkedin: "https://www.linkedin.com/in/mikael-h-87bb4ba4/",
  },
  {
    id: 9,
    img: member6,
    classnames: "rounded-[13px] sm:rounded-[26px] w-[73px] sm:w-[183px]",
    infoPosClassnames:
      "bottom-[-80%] sm:bottom-[-35%] lg:bottom-auto lg:left-[70%]",
    name: "Deniz Omar",
    position: "Co-Founder & CEO",
    twitter: "https://twitter.com/DenizOmer",
    linkedin: "https://www.linkedin.com/in/denizomer/",
  },
  {
    id: 10,
    img: member7,
    classnames: "rounded-[13px] sm:rounded-[26px] w-[60px] sm:w-[151px]",
    infoPosClassnames:
      "bottom-[-120%] sm:bottom-[-35%] lg:bottom-auto lg:left-[70%]",
    name: "Charles Nwankwo",
    position: "Developer",
    twitter: "https://twitter.com/Chadnium",
    linkedin: "https://www.linkedin.com/in/getgiddy/",
  },
  {
    id: 11,
    img: member8,
    classnames: "rounded-[13px] sm:rounded-[26px] w-[63px]  sm:w-[158px]",
    infoPosClassnames:
      "right-[30%] bottom-[-140%] sm:bottom-[-15%] lg:bottom-auto lg:left-[70%]",
    name: "Paris Charanas Giannakou",
    position: "Analyst and Content Editor",
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
            <a
              href={data.twitter}
              target="_blank"
              className="cursor-pointer flex items-center w-[22px] h-[22px] rounded-full justify-center bg-blue mr-2"
            >
              <i className="text-white text-xs ri-twitter-fill"></i>
            </a>

            <a
              href={data.linkedin}
              target="_blank"
              className="cursor-pointer flex items-center w-[22px] h-[22px] rounded-full justify-center bg-blue"
            >
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
              className="absolute z-10 top-[50.5%] left-[50%] font-medium text-aluminium text-[22px] sm:text-[2.25rem] tracking-[1px]"
              style={{ transform: "translate(-50%, -50%)" }}
            >
              OUR TEAM
            </p>
            <div className="flex flex-col">
              <div className="flex gap-x-2 justify-center">
                {teamData.slice(0, 5).map((data) => (
                  <TeamCard key={data.id} data={data} type="top" />
                ))}
              </div>

              <div className="flex mt-1.5 sm:mt-2 gap-x-2 justify-center items-center">
                {teamData.slice(5, 11).map((data) => (
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
