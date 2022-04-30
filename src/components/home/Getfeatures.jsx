import React, { useState } from "react";
import { useFormFields, useMailChimpForm } from "use-mailchimp-form";

const Form = () => {
  const postUrl =
    "https://alphaday.us20.list-manage.com/subscribe/post?u=a526fcf0309d049cc366e94e0&amp;id=6279b67a6a";
  const { fields, handleFieldChange } = useFormFields({
    EMAIL: "",
  });

  const { loading, error, success, message, handleSubmit } =
    useMailChimpForm(postUrl);

  const isValidEmail = (email) => {
    if (email.indexOf("@") === -1) {
      return false;
    }
    return true;
  };

  return (
    <>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          handleSubmit(fields);
        }}
        className="bg-black px-2 md:px-4 py-1 rounded-2xl w-full mx-auto md:w-[450px] lg:w-[550px] md:ml-4 flex justify-end items-center"
      >
        <input
          id="EMAIL"
          type="email"
          placeholder="Email address"
          value={fields.EMAIL}
          onChange={handleFieldChange}
          className="bg-transparent py-3 md:py-4 pl-2 pr-4 w-full outline-0 text-aluminium md:text-sm text-xs"
          required
        />
        <button
          type="submit"
          className="bg-blue text-white pb-1 pt-1.5 md:py-2 px-4 -mr-1 rounded-xl"
        >
          Subscribe
        </button>
      </form>
      {loading ? (
        <div className="mt-2.5 ml-1 md:ml-5 text-sm">Subscribing...</div>
      ) : error ? (
        <div className="mt-2.5 ml-1 md:ml-5 text-sm text-[#cc1b1b]">
          {message}
        </div>
      ) : success ? (
        <div className="mt-2.5 ml-1 md:ml-5 text-sm text-[#1a7b66]">
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
    <section className="mx-auto w-11/12 max-w-7xl py-8 bg-california relative top-[-90px] rounded-3xl">
      <div className="px-4 md:px-8 flex flex-col md:flex-row justify-between items-center">
        <div className="mb-8 md:m-0">
          <h3 className="text-black w-full  max-w-[400px] text-2xl md:text-3xl mb-4 font-medium ">
            Get access to early features
          </h3>
          {/* <p className="cursor-pointer rounded border border-[#00000050] w-fit px-1.5 pt-[2.3px] text-xs">
            PREVIOUS NEWSLETTER ISSUES
          </p> */}
        </div>

        <div className="w-[280px] md:w-auto">
          <Form />
        </div>
      </div>
    </section>
  );
}

export default Getfeatures;
