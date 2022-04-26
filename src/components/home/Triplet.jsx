import React from 'react'
import { Card, CardText, CardTitle } from '../../shared';
import nft from "../../images/workflow/nft.png";
import dapps from "../../images/workflow/dapps.png";
import code from "../../images/workflow/code.png";

function Triplet() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <Card className="overflow-hidden h-[370px] lg:h-[420px]">
            <div>
                <CardTitle className="w-full max-w-[200px]">Use your favourite dapps</CardTitle>
                <p className="text-california tracking-[.1em] text-xs">COMING SOON</p>
            </div>

            <div className="mt-8 md:mt-16">
                <figure className="flex justify-center items-center mt-4">
                    <img src={dapps} className="w-[80%] md:w-[80%] object-fit drop-shadow-[0px_20px_60px_rgba(255, 255, 255, 0.15)]" alt="dapps"/>
                </figure>
            </div>
        </Card>

        <Card className="overflow-hidden h-[370px] lg:h-[420px]">
            <div>
                <CardTitle className="w-full max-w-[200px]">Code your own widgets</CardTitle>
                <p className="text-california tracking-[.1em] text-xs">COMING SOON</p>
            </div>

            <div className="mt-8 lg:mt-16">
                <figure className="flex justify-center items-center">
                    <img src={code} className="w-[70%] md:w-[70%]" alt="code"/>
                </figure>
                
            </div>
        </Card>

        <Card className="overflow-hidden h-[370px] lg:h-[420px]">
            <div>
                <CardTitle className="w-full max-w-[250px]">Track NFT floors and project updates</CardTitle>
                <p className="text-california tracking-[.1em] text-xs">COMING SOON</p>
            </div>

            <div className="mt-16 lg:mt-24">
                <figure className="flex justify-center items-center">
                    <img src={nft} className="w-[100%] md:w-[80%]" alt="nft"/>
                </figure>
                
            </div>
        </Card>
    </div>
  )
}

export default Triplet;