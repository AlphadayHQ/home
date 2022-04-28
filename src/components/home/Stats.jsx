import React from "react";

function Stats() {
  const Item = ({ text, className, count }) => (
    <div
      className={`flex justify-start items-start w-[305px] mb-2 md:mb-0 ${className}`}
    >
      <h2 className="h-16 text-right md:text-left md:h-20 w-[100px] md:w-auto self-center lg:self-start text-4xl lg:text-7xl font-bold mr-2 xl:mr-0 md:pt-2">
        {count}
      </h2>
      <div className="w-[180px] sm:w-[210px] md:w-auto ml-1 md:ml-2.5 xl:ml-[17px] font-medium">
        <p className="h-16 md:h-20 flex items-center mb-3 text-lg lg:text-xl">
          {text}
        </p>
        <p className="text-[10px] border rounded px-2 pt-[1.5px] w-fit mt-1 lg:mt-4">
          FULL LIST
        </p>
      </div>
    </div>
  );

  return (
    <div className="bg-california rounded-xl p-4 md:px-10 pb-8 lg:px-14 lg:py-10 xl:px-24 xl:py-14">
      <div
        className={`mx-auto flex flex-col md:flex-row justify-between items-center md:items-start flex-1`}
      >
        <Item
          count="30+"
          text="widgets"
          className="md:w-auto lg:w-[220px] md:mr-6"
        />

        <Item
          count="500+"
          text="projects tracked"
          className="md:w-auto lg:w-[280px] md:mr-6"
        />

        <Item
          count="159"
          text="sources of information aggregated"
          className="lg:w-[360px]"
        />
      </div>
    </div>
  );
}

export default Stats;
