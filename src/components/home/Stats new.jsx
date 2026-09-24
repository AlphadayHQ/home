
import React, {useState} from "react";
import { information, projects } from "./statsData";


function Thirty({ handler }){
  return(
    <div className="flex flex-col md:flex-row justify-between">
      <div className="mb-4 md:mb-0 w-fit flex justify-between items-start">
        <h2 className="text-4xl lg:text-7xl font-bold mr-2">30</h2>
        <div className="">
          <span className="text-lg lg:text-xl">
            widgets
          </span>

          <div onClick={() => {handler()}} className="flex justify-center items-center cursor-pointer text-[10px] border rounded px-1 w-fit mt-1 lg:mt-4">
            <p>CLOSE LIST</p>
            <i className="ml-1 ri-close-line"></i>
          </div>
        </div>
      </div>

     
    </div>
  )
}

function Projects({ handler }){
  return(
    <div className="flex flex-col md:flex-row md:justify-between"> 
      <div className="mb-4 md:mb-0 w-fit flex justify-between items-start">
        <h2 className="text-4xl lg:text-7xl font-bold mr-2 xl:mr-0">500+</h2>
        <div className="">
          <span className="text-lg lg:text-xl">
            projects tracked
          </span>

          <div onClick={() => {handler()}} className="flex justify-center items-center cursor-pointer text-[10px] border rounded px-1 w-fit mt-1 lg:mt-4">
            <p>CLOSE LIST</p>
            <i className="ml-1 ri-close-line"></i>
          </div>
        </div>
      </div>

      <div className="w-[65%] grid grid-cols-1 gap-2 md:grid-cols-3">
        {
          projects.map((info, index) => {
            return (
              <div key={index} className="md:max-w-[200px]">
                <p>{info.category}</p>
                <span>
                  {
                    info.items.map((el, index) =>{
                      return (
                        <small key={index}>{index === info.items.length - 1 ? `${el}` : `${el}, ` }</small>
                      )
                    })
                  }
                </span>
              </div>
            )
          })
        }
      </div>
    </div>
  )
}

function Information({ handler }){
  return(
    <div className="flex flex-col md:flex-row md:justify-between"> 
      <div className="mb-4 md:mb-0 flex justify-between items-start w-fit md:max-w-[250px] lg:max-w-[350px]">
        <h2 className="text-4xl lg:text-7xl font-bold mr-2">159</h2>
        <div className="">
          <span className="text-lg lg:text-xl">
            sources of information aggregated
          </span>

          <div onClick={() => {handler()}} className="flex justify-center items-center cursor-pointer text-[10px] border rounded px-1 w-fit mt-1 lg:mt-2">
            <p>CLOSE LIST</p>
            <i className="ml-1 ri-close-line"></i>
          </div>
        </div>
      </div>

      <div className="w-[65%] grid grid-cols-1 gap-2 md:grid-cols-3">
        {
          information.map((info, index) => {
            return (
              <div key={index} className="max-w-[200px]">
                <p>{info.category}</p>
                <span>
                  {
                    info.items.map((el, index) =>{
                      return (
                        <small key={index}>{index === info.items.length - 1 ? `${el}` : `${el}, ` }</small>
                      )
                    })
                  }
                </span>
              </div>
            )
          })
        }
      </div>
    </div>
  )
}

function Stats() {
  const [innerInfo, setInnerInfo] = useState("");
  const [showInfo, setshowInfo] = useState(false);

  function handleInnerInfo(arg){
    setInnerInfo(arg);
    setshowInfo(true);
  }

  function handleshowInfo(){
    setshowInfo(!showInfo)
  }

  return (
    <section className="h-auto">
      <div className=" w-full h-auto">
        {
          showInfo ||
          <div className="bg-california rounded-xl">

          <div className="mx-auto p-4 lg:px-8 lg:py-8 w-fit flex flex-col sm:grid sm:grid-cols-[140px_.8fr] place-content-center gap-4 md:gap-8 md:grid-cols-[140px_180px_280px] xl:gap-16 lg:grid-cols-[210px_270px_330px] xl:grid-cols-[220px_340px_440px]">

            <div className="w-fit flex justify-between items-start">
              <h2 className="text-4xl lg:text-7xl font-bold mr-2">30</h2>
              <div className="">
                <span className="text-lg lg:text-xl">
                  widgets
                </span>

                <p onClick={() => handleInnerInfo("30")} className="cursor-pointer text-[10px] border rounded px-2 w-fit mt-1 lg:mt-4">
                  FULL LIST
                </p>
              </div>
            </div>

            <div className="w-fit flex justify-between items-start">

              <h2 className="text-4xl lg:text-7xl font-bold mr-2">500+</h2>
              <div className="">
                <span className="text-lg lg:text-xl">
                  projects tracked
                </span>
                <p onClick={() => handleInnerInfo("500")} className="cursor-pointer text-[10px] border rounded px-2 w-fit mt-1 lg:mt-4">
                  FULL LIST
                </p>
              </div>
            </div>

            <div className="col-span-2 md:col-span-1 flex justify-between items-start">

              <h2 className="text-4xl lg:text-7xl font-bold mr-2">159</h2>
              <div className="">
                <span className="text-lg lg:text-xl">
                  sources of information aggregated

                </span>
                <p onClick={() => handleInnerInfo("159")} className="cursor-pointer text-[10px] border rounded px-2 w-fit mt-1 lg:mt-4">
                  FULL LIST
                </p>
              </div>
            </div>
          </div>
        
          </div>
        }

          {
            showInfo &&
            <div className={`bg-california rounded-xl w-full h-full top-0 left-0 p-4 lg:px-8 lg:py-8 ${showInfo ? "opacity-100" : "opacity-0" } transition-all duration-300 ease-in-out`}>
              {
                innerInfo == "30" && <Thirty handler={handleshowInfo}/>
              }

              {
                innerInfo == "500" && <Projects handler={handleshowInfo}/>
              }

              {
                innerInfo == "159" && <Information handler={handleshowInfo}/>
              }
            </div>
          }
      </div>
    </section>
  );
}

export default Stats;
