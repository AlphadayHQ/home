import React from 'react'

function Stats() {
  return (
    <div className="bg-california rounded-xl p-4 lg:px-8 lg:py-8">
        <div className="mx-auto w-fit grid grid-cols-[120px_1fr] gap-4 md:gap-8 lg:gap-16 md:grid-cols-[120px_180px_280px] lg:grid-cols-[180px_280px_480px]">
            <div className="flex justify-between items-start md:items-center">
                <h2 className="text-4xl lg:text-7xl font-bold">30</h2>
                <div className="">
                    <span className="text-lg lg:text-2xl font-bold leading-[1]">widgets</span>
                    <p className="text-[10px] border rounded px-2 w-fit mt-1 lg:mt-4">FULL LIST</p>
                </div>
            </div>

            <div className="flex justify-between items-start">
                <h2 className="text-4xl lg:text-7xl font-bold mr-2 md:mr-2">500+</h2>
                <div className="">
                    <span className="text-lg lg:text-2xl font-bold leading-[1]">projects tracked</span>
                    <p className="text-[10px] border rounded px-2 w-fit mt-1 lg:mt-4">FULL LIST</p>
                </div>
            </div>

            <div className="col-span-2 md:col-span-1 flex justify-between items-start">
                <h2 className="text-4xl lg:text-7xl font-bold mr-2 md:mr-2">159</h2>
                <div className="">
                    <span className="text-lg lg:text-2xl font-bold leading-[1]">sources of information aggregated</span>
                    <p className="text-[10px] border rounded px-2 w-fit mt-1 lg:mt-4">FULL LIST</p>
                </div>
            </div>
        </div>
    </div>
  )
}

export default  Stats;