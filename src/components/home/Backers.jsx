import React from "react";
import { backers, contributors } from "./backersData";
import { Section, Div } from "../../shared";

function Backers() {
  return (
    <Section className="bg-eerie">
      <Div>
        <div className="">
          <div className="mb-8">
            <h2 className="text-[22px] font-medium text-aluminium text-center">
              OUR BACKERS
            </h2>
          </div>
          <div className="mb-8 grid place-content-center grid-cols-2 md:grid-cols-3 lg:grid-cols-6 w-full mx-auto gap-4">
            {backers.map((item) => {
              return (
                <figure key={item.id} className="flex justify-center">
                  <a
                    target="_blank"
                    href={item.link}
                    className="transcale flex items-center"
                  >
                    <img
                      src={item.img}
                      className={`my-4 ${item.size}`}
                      alt="partner"
                    />
                  </a>
                </figure>
              );
            })}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full mx-auto max-w-xl">
            {contributors.map((item) => {
              return (
                <div
                  key={item.id}
                  className="flex flex-col justify-center items-center"
                >
                  <figure className=" rounded-full mb-2">
                    <a target="_blank" href={item.link}>
                      <img
                        src={item.img}
                        className="w-[80px] h-[80px]"
                        alt="contributor"
                      />
                    </a>
                  </figure>
                  <p className="mb-2 text-sm text-platinum">
                    {item.contributor}
                  </p>
                  <a
                    target="_blank"
                    href={item.link}
                    className="text-xs text-aluminium justify-self-center bg-black rounded-full px-4 py-2"
                  >
                    {item.handle}
                  </a>
                </div>
              );
            })}
          </div>
        </div>
      </Div>
    </Section>
  );
}

export default Backers;
