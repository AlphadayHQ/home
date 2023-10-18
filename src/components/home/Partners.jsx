import React from "react";
import { partners } from "./partnersData";
import { Section, Div } from "../../shared";

function Partners() {
  return (
    <Section className="bg-eerie">
      <Div className="pb-0">
        <div className="">
          <div className="mb-8">
            <h2 className="text-[22px] font-medium text-aluminium text-center">
              BOARD PARTNERS
            </h2>
          </div>
          <div className="grid place-content-center grid-cols-2 md:grid-cols-3 lg:grid-cols-6 w-full mx-auto gap-4">
            {partners.map((item) => {
              return (
                <figure
                  key={item.id}
                  className={`flex justify-center ${
                    item.id === "13" ? "col-[1/-1] h-24" : ""
                  }`}
                >
                  <a
                    target="_blank"
                    href={`https://app.alphaday.com/b/${item.slug}`}
                    className="transcale flex items-center"
                  >
                    <img
                      src={item.img}
                      className={`my-4 ${item.size}`}
                      alt="partner"
                      title={item.partner}
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
