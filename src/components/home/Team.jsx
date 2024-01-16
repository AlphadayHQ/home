import React from "react";
import { Section, Div, Title } from "../../shared";
import { positionData, shuffleTeam, teamData } from "./teamUtils";

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
              className="cursor-pointer flex items-center w-8 h-8 rounded-full justify-center bg-blue mr-2"
            >
              <i className="text-white text-sm ri-twitter-fill"></i>
            </a>

            <a
              href={data.linkedin}
              target="_blank"
              className="cursor-pointer flex items-center w-8 h-8 rounded-full justify-center bg-blue"
            >
              <i className="text-white text-sm ri-linkedin-fill"></i>
            </a>
          </div>
        </div>
      </figure>
    </div>
  );
}

function Team() {
  // teamData.length should be equal to positionData.length
  const shuffledTeam = shuffleTeam(teamData, positionData);
  return (
    <Section>
      <Div>
        <div className="">
          <div className="mb-24 w-full flex flex-col items-center">
            <Title>Our Mission</Title>
            <div className="md:w-[500px]">
              <p className="text-aluminium text-xs md:text-base mt-4 text-center">
                Alphaday&apos;s mission is to bring you all the tools needed to
                follow your favorite projects, stay up-to-date with the latest
                narratives, and use your favorite dapps, all from the comfort of
                one easy-to-use customizable dashboard.
              </p>
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
                {shuffledTeam.slice(0, 5).map((data) => (
                  <TeamCard key={data.id} data={data} type="top" />
                ))}
              </div>

              <div className="flex mt-1.5 sm:mt-2 gap-x-2 justify-center items-center">
                {shuffledTeam.slice(5, 11).map((data) => (
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
