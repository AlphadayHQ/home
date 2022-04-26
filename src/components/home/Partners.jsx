import React from 'react'
import { partners, contributors } from "./partnersData";
import { Section, Div } from '../../shared';

function Partners() {
  return (
    <Section className="bg-eerie">
        <Div>
            <div className="">
                <div className="mb-8">
                    <h2 className="text-[22px] font-medium text-aluminium text-center">OUR PARTNERS</h2>
                </div>
                <div className="mb-8 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 w-full mx-auto gap-4">
                    {
                        partners.map((item) => {
                            return(
                                <figure key={item.id} className="self-center">
                                    <img src={item.partner} className="w-[80%] object-fit" alt="partner"/>
                                </figure>
                            )
                        })
                    }
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 w-full mx-auto max-w-xl">
                    {
                        contributors.map((item) => {
                            return(
                                <div key={item.id} className="flex flex-col justify-center items-center">
                                    <figure className="h-[100px] w-[100px] rounded-full mb-2">
                                        <img src={item.img} className="w-[100%] object-fit" alt="contributor"/>
                                    </figure>
                                    <p className="mb-2 text-sm text-platinum">{item.contributor}</p>
                                    <a className="text-xs text-aluminium justify-self-center bg-black rounded-full px-4 py-2">
                                        {item.handle}
                                    </a>
                                </div>
                            )
                        })
                    }
                </div>
            </div>
        </Div>
    </Section>
  )
}

export default Partners;
