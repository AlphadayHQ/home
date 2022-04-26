import React from "react";

function Stats() {
  return (
    <div className="bg-california rounded-xl p-4 lg:px-8 lg:py-8">

      <div className="mx-auto w-fit grid grid-cols-[140px_.8fr] place-content-center gap-4 md:gap-8 md:grid-cols-[140px_180px_280px] xl:gap-16 lg:grid-cols-[210px_270px_330px] xl:grid-cols-[220px_340px_440px]">

        <div className="flex justify-between items-start">
          <h2 className="text-4xl lg:text-7xl font-bold mr-2 xl:mr-0">30+</h2>
          <div className="">
            <span className="text-lg lg:text-xl">
              widgets
            </span>

            <p className="text-[10px] border rounded px-2 w-fit mt-1 lg:mt-4">
              FULL LIST
            </p>
          </div>
        </div>

        <div className="flex justify-between items-start">

          <h2 className="text-4xl lg:text-7xl font-bold mr-2 xl:mr-0">500+</h2>
          <div className="">
            <span className="text-lg lg:text-xl">
              projects tracked
            </span>
            <p className="text-[10px] border rounded px-2 w-fit mt-1 lg:mt-4">
              FULL LIST
            </p>
          </div>
        </div>

        <div className="col-span-2 md:col-span-1 flex justify-between items-start">

          <h2 className="text-4xl lg:text-7xl font-bold mr-2 xl:mr-0">159</h2>
          <div className="">
            <span className="text-lg lg:text-xl">
              sources of information aggregated

            </span>
            <p className="text-[10px] border rounded px-2 w-fit mt-1 lg:mt-4">
              FULL LIST
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Stats;
