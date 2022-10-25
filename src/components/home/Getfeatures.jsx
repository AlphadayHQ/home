import React, { useState } from "react";
import CONFIG from "../../config";
import { useEmailForm } from "../../utils/useEmailForm";

const Form = () => {
  const [email, setEmail] = useState("");

  const { loading, error, success, message, handleSubmit } = useEmailForm(
    CONFIG.emailSubscrptionUrl
  );

  const isValidEmail = (email) => /^\S+@\S+\.\S+$/.test(email);

  return (
    <>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (isValidEmail(email)) handleSubmit(email);
        }}
        className="bg-black px-3 md:px-3.5 rounded-[20px] md:rounded-[22px] w-full mx-auto md:w-[450px] lg:w-[550px] md:ml-4 flex justify-end items-center"
      >
        <input
          id="EMAIL"
          type="email"
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="bg-transparent my-2 py-0.5 md:py-2 pl-2 pr-2 mr-2 w-full outline-0 text-aluminium md:text-lg leading-6 text-[13px] rounded-xl"
          required
        />
        <button
          type="submit"
          className="bg-blue text-[13px] md:text-[15px] leading-[21px] text-white pb-1 pt-1.5 md:py-2 px-4 -mr-1 rounded-xl"
        >
          Subscribe
        </button>
      </form>
      {loading ? (
        <div className="mt-1 ml-2 md:ml-5 font-semibold text-xs md:text-sm leading-[21px] ">
          Subscribing...
        </div>
      ) : error ? (
        <div className="mt-1 ml-2 md:ml-5 font-semibold text-xs md:text-sm leading-[21px]  text-[#cc1b1b]">
          {message}
        </div>
      ) : success ? (
        <div className="mt-1 ml-2 md:ml-5 font-semibold text-xs md:text-sm leading-[21px]  text-[#1a7b66]">
          Subscribed!
        </div>
      ) : (
        <br />
      )}
    </>
  );
};

function Getfeatures() {
  return (
    <section className="mx-auto w-11/12 max-w-7xl py-8 md:py-10 bg-california relative top-[-90px] rounded-3xl">
      <div className="px-4 md:px-8 flex flex-col md:flex-row w-full justify-between items-center">
        <div className="mb-8 md:m-0">
          <h3 className="text-black w-full  max-w-[400px] text-2xl md:text-3xl font-medium ">
            Sign-up to stay up to date.
          </h3>
          {/* <p className="cursor-pointer rounded border border-[#00000050] mt-4  w-fit px-1.5 pt-[2.3px] text-xs">
            PREVIOUS NEWSLETTER ISSUES
          </p> */}
        </div>

        <div className="min-w-[280px] flex items-center  w-auto">
          <Form />
        </div>
      </div>
    </section>
  );
}

export default Getfeatures;
