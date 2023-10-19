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
            {partners.map((item, index) => {
              return (
                <figure
                  key={item.id}
                  className={`flex justify-center ${
                    index === partners.length - 1 && "[grid-column-end:_-3]"
                  }
                  ${index === partners.length - 2 && "[grid-column-end:_4]"}`}
                >
                  <a
                    target="_blank"
                    href={
                      item.slug
                        ? `https://app.alphaday.com/b/${item.slug}`
                        : undefined
                    }
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
