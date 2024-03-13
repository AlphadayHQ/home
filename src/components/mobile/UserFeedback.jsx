import React, { useState } from "react";
import { Section } from "../../shared";

const feedbackDetails = [
  {
    name: "Anthony Sassano",
    Company: "The Daily Gwei",
    feedback:
      "Alphaday has transformed the way I manage my crypto portfolio. It's intuitive, comprehensive, and all-encompassing.",
    img: "https://flowbite.com/docs/images/carousel/carousel-2.svg",
  },
  {
    name: "John Sassano",
    Company: "The Daily Gwei",
    feedback:
      "Alphaday is a great tool for anyone who wants to keep up with the latest news and events in the Ethereum ecosystem. The team behind it is also very responsive and open to feedback!",
    img: "https://flowbite.com/docs/images/carousel/carousel-3.svg",
  },
];

const UserFeedback = () => {
  const [selectedOptionId, setSelectedOptionId] = useState(0);

  const handleNext = () => {
    setSelectedOptionId((selectedOptionId + 1) % feedbackDetails.length);
  };

  const handlePrev = () => {
    setSelectedOptionId((selectedOptionId || feedbackDetails.length) - 1);
  };

  return (
    <Section className="h-auto w-ful bg-eerie">
      <div className="mx-auto w-11/12 max-w-7xl py-10">
        <h2 className="uppercase text-center text-platinum mt-2">
          What users are saying
        </h2>
        <p className="text-platinum mt-4 text-center max-w-sm mx-auto">
          Join thousands of users who trust Alphaday for their crypto
          management!
        </p>
        <div class="max-w-md mx-auto mt-10">
          <div id="default-carousel" class="relative" data-carousel="static">
            {/* <!-- Carousel wrapper --> */}
            <div class="overflow-hidden relative rounded-lg">
              {/* <!-- Item 1 --> */}
              <div class="hidden- duration-700 ease-in-out" data-carousel-item>
                <div className="flex justify-center items-center mx-4">
                  <img
                    src="https://flowbite.com/docs/images/carousel/carousel-2.svg"
                    alt=""
                    className="w-12 h-12 rounded-full mb-10"
                  />
                  <div className="flex flex-col ml-4">
                    <p className="text-aluminium">
                      {feedbackDetails[selectedOptionId].feedback}
                    </p>
                    <p className="text-aluminium mt-4">
                      <span className="font-semibold">
                        {feedbackDetails[selectedOptionId].name}
                      </span>{" "}
                      | {feedbackDetails[selectedOptionId].Company}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            {/* <!-- Slider indicators --> */}
            <div class="hidden absolute bottom-5 left-1/2 z-30 space-x-3 -translate-x-1/2">
              <button
                type="button"
                class="w-3 h-3 rounded-full"
                aria-current="false"
                aria-label="Slide 1"
                data-carousel-slide-to="0"
              ></button>
              <button
                type="button"
                class="w-3 h-3 rounded-full"
                aria-current="false"
                aria-label="Slide 2"
                data-carousel-slide-to="1"
              ></button>
              <button
                type="button"
                class="w-3 h-3 rounded-full"
                aria-current="false"
                aria-label="Slide 3"
                data-carousel-slide-to="2"
              ></button>
            </div>
            {/* <!-- Slider controls --> */}
            <div className="flex justify-center mt-8">
              <button
                type="button"
                class="flex z-30 justify-center items-center px-4 cursor-pointer group focus:outline-none"
                data-carousel-prev
                onClick={handlePrev}
              >
                <span class="inline-flex justify-center items-center w-8 h-8 rounded-full sm:w-10 sm:h-10 bg-white/30 dark:bg-gray-800/30 group-hover:bg-white/50 dark:group-hover:bg-gray-800/60 group-focus:ring-4 group-focus:ring-white dark:group-focus:ring-gray-800/70 group-focus:outline-none">
                  <svg
                    class="w-5 h-5 text-white sm:w-6 sm:h-6 dark:text-gray-800"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M15 19l-7-7 7-7"
                    ></path>
                  </svg>
                  <span class="hidden">Previous</span>
                </span>
              </button>
              <button
                type="button"
                class="flex z-30 justify-center items-center px-4 cursor-pointer group focus:outline-none"
                data-carousel-next
                onClick={handleNext}
              >
                <span class="inline-flex justify-center items-center w-8 h-8 rounded-full sm:w-10 sm:h-10 bg-white/30 dark:bg-gray-800/30 group-hover:bg-white/50 dark:group-hover:bg-gray-800/60 group-focus:ring-4 group-focus:ring-white dark:group-focus:ring-gray-800/70 group-focus:outline-none">
                  <svg
                    class="w-5 h-5 text-white sm:w-6 sm:h-6 dark:text-gray-800"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M9 5l7 7-7 7"
                    ></path>
                  </svg>
                  <span class="hidden">Next</span>
                </span>
              </button>
            </div>
          </div>
          {/* <script src="https://unpkg.com/flowbite@1.4.0/dist/flowbite.js"></script> */}
        </div>
      </div>
    </Section>
  );
};

export default UserFeedback;
