import React from "react"
import { Section, Div, Title } from "../../shared";
import team from "../../images/team/team.svg";
function Team() {
  return (
    <Section>
        <Div>
            <div className="">
                <div className="mb-24">
                    <Title>Why we do this?</Title>
                    <div className="md:w-[500px]">
                        <p className="text-aluminium text-xs md:text-sm">
                            Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
                        </p>
                        
                        <p className="text-aluminium text-xs md:text-sm mt-4">
                            Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
                        </p>
                    </div>
                </div>

                <div className="flex justify-center items-center relative">
                    <p className="absolute top-[50%] left-[50%] text-aluminium font-medium text-xl" style={{transform: "translate(-50%, -50%)"}}>OUR TEAM</p>
                    <figure className="">
                        <img src={team} className="w-[100%] object-fit" alt="team"/>
                    </figure>
                </div>
            </div>
        </Div>
    </Section>
  )
}

export default Team;


