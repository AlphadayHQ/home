import React from "react";
import { partners } from "./partnersData";
import { Section, Div } from "../../shared";

function Partners() {
  return (
    <Section className="bg-eerie">
      <Div>
        <div className="">
          <div className="mb-8">
            <h2 className="text-[22px] font-medium text-aluminium text-center">
              OUR PARTNERS
            </h2>
          </div>
          <div className="mb-8 grid place-content-center grid-cols-2 md:grid-cols-3 lg:grid-cols-6 w-full mx-auto gap-4">
            {partners.map((item) => {
              return (
                <figure key={item.id} className="flex justify-center">
                  <a target="_blank" href={item.link} className="transcale flex items-center">
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
        </div>
      </Div>
    </Section>
  );
}

export default Partners;
