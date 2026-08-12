import React, { useState } from "react";
import { Section } from "../../shared";
import CONFIG from "../../config";
import { useEmailForm } from "../../utils/useEmailForm";
import { API_STATS, TOOL_COUNT } from "../../data/apiSurface";

const isValidEmail = (email) => /^\S+@\S+\.\S+$/.test(email);

const NewsletterForm = () => {
  const [email, setEmail] = useState("");
  const { loading, error, success, message, handleSubmit } = useEmailForm(
    CONFIG.emailSubscrptionUrl,
  );

  return (
    <div className="mt-7 flex flex-col items-center">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (isValidEmail(email)) handleSubmit(email);
        }}
        className="flex bg-background rounded-full p-1.25 w-full max-w-100"
      >
        <label htmlFor="EMAIL" className="sr-only">
          Email address
        </label>
        <input
          id="EMAIL"
          type="email"
          placeholder="Email address"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          className="flex-1 min-w-0 bg-transparent outline-0 text-text text-[14.5px] px-4 py-2.25"
        />
        <button
          type="submit"
          disabled={loading}
          className="btn-primary rounded-full text-[13.5px] px-5 py-2.25 disabled:opacity-70"
        >
          Subscribe
        </button>
      </form>
      <div className="text-[13px] font-semibold mt-2 h-5" aria-live="polite">
        {loading && <span className="text-background/70">Subscribing…</span>}
        {error && <span className="text-[#7a1a1a]">{message}</span>}
        {success && <span className="text-[#0f5c4a]">Subscribed!</span>}
      </div>
    </div>
  );
};

function FinalCTA() {
  const sourceCount = API_STATS[0].num;

  return (
    <Section id="signup" className="bg-background scroll-mt-16">
      <div className="mx-auto w-11/12 max-w-7xl pb-24">
        <div className="bg-primary text-background rounded-[18px] px-8 py-14 text-center">
          <h2 className="font-display text-[clamp(26px,3.6vw,38px)] font-extrabold tracking-tight">
            Start building. No signup.
          </h2>
          <p className="font-mono text-[13px] font-semibold tracking-wide text-background/70 mt-3.5">
            $0 — all {sourceCount} sources · all {TOOL_COUNT} tools · MCP and
            REST · no API key
          </p>

          <div className="mt-6.5 flex flex-wrap gap-3 justify-center">
            <a
              className="bg-background text-text rounded-[10px] px-7 py-3.5 font-bold hover:-translate-y-px transition-transform duration-200"
              href={CONFIG.apiDocs}
            >
              Read the docs
            </a>
            <a
              className="border-2 border-background text-background rounded-[10px] px-7 py-3.5 font-bold hover:-translate-y-px transition-transform duration-200"
              href={CONFIG.alphadayApp}
            >
              Launch app
            </a>
          </div>

          <NewsletterForm />
        </div>
      </div>
    </Section>
  );
}

export default FinalCTA;
