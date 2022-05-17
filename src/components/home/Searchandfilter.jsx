import React, { useState } from "react";
import {
  CardText,
  CardTitle,
  FlipCard,
  FlipCardInner,
  FlipCardFront,
  FlipCardBack,
  FlipCardClose,
  FlipCardButton,
} from "../../shared/index";
// import searchbg from "../../images/bg-text.png";

const Form = () => {
  const submitHandler = (e) => {
    e.preventDefault();
  };

  return (
    <form
      className="flex justify-between font-sans items-center w-full lg:w-[560px] bg-[#0A0A0B] rounded-[25px] py-2 px-2 border-[15px] border-[#1E2024]"
      style={{ boxShadow: "0px 2px 60px rgba(255, 255, 255, 0.15)" }}
      onSubmit={(e) => submitHandler(e)}
    >
      <button className="bg-[#263964] font-light text-white rounded-[10px] pt-2 pb-1.5 px-2 flex justify-between items-center">
        <small className="mr-2 tracking-[.1em]">Uniswap</small>
        <i className="text-xs ri-close-fill"></i>
      </button>

      <input
        className="pt-1 pb-0.5 font-inter text-black outline-0 placeholder:text-[#505562] w-full bg-[#0A0A0B] px-2 text-sm "
        placeholder="Search for assets, projects, events, etc..."
      />

      <i className="text-xl text-[#505562] ri-search-2-line"></i>
    </form>
  );
};

function Searchandfilter() {
  const [searchToggle, setSearchToggle] = useState(false);

  function handleSearchToggle() {
    setSearchToggle((prev) => !prev);
  }

  return (
    <div className="grid grid-cols-1">
      <FlipCard className="overflow-hidden h-[300px]">
        <FlipCardInner className={`${searchToggle ? "flipThis" : ""}`}>
          <FlipCardFront className="pt-8 pb-8">
            <div
              className={` ${
                searchToggle ? "" : "relative"
              } h-full w-full md:bg-[url('../../images/bg-text.png')] bg-no-repeat bg-center flex flex-col xl:flex-row`}
            >
              <div>
                <CardTitle className="w-full md:w-[300px]">
                  Search by any project, blockchain, token, person
                </CardTitle>
                <FlipCardButton handler={handleSearchToggle}>
                  How it works
                </FlipCardButton>
              </div>

              <div className="flex items-center justify-center mt-8 sm:mt-4 lg:mt-0">
                <Form />
              </div>
            </div>
          </FlipCardFront>

          <FlipCardBack>
            <CardTitle className="w-full max-w-[475px]">
              Search by any project, blockchain, token, person.
            </CardTitle>

            <div className="relative h-[60%] md:h-[65%] lg:h-[70%] xl:h-[75%] flex flex-col justify-between items-start mt-8">
              <CardText className="w-full max-w-[450px]">
                Lorem ipsum, dolor sit amet consectetur adipisicing elit. Rerum
                quae mollitia velit quam. Asperiores eligendi omnis corrupti,
                assumenda nemo necessitatibus, accusantium ullam eaque placeat
                ea labore. Quisquam dicta error quaerat.
              </CardText>

              <div className="absolute bottom-0 md:bottom-11">
                <FlipCardClose handler={handleSearchToggle}>
                  <p className="mr-2">CLOSE</p>
                  <i className="ri-close-fill"></i>
                </FlipCardClose>
              </div>
            </div>
          </FlipCardBack>
        </FlipCardInner>
      </FlipCard>
    </div>
  );
}

export default Searchandfilter;
