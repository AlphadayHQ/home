import React from 'react'
import { Card, CardText, CardTitle } from '../../shared';
import track from "../../images/workflow/track.png";


function Track() {
  return (
    <div className="grid grid-cols-1">
      <Card className="overflow-hidden h-[400px] lg:h-[590px]">
        <div>
          <CardTitle className="w-full md:w-[570px]">
            Keep track of your portfolio's balances, performance, activity, and
            other metrics for all your wallets in one place
          </CardTitle>
          <CardText>See what you can do</CardText>
        </div>

        <div className="mt-16">
          <figure className="flex justify-center items-center mt-4">
            <img
              src={track}
              className="w-[100%] lg:w-[80%] object-fit"
              alt="track"
            />
          </figure>
        </div>
      </Card>
    </div>
  );
}

export default Track
