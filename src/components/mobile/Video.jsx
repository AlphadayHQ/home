import React, { useEffect, useRef } from "react";
import { Section } from "../../shared";
// import CONFIG from "../../config";
import SuperfeedImage from "../../images/mobile/superfeed.jpg";

const Video = () => {
  /**
   * Before the iframe loads the browser displays a white page.
   * For that reason we set its visibility to hidden until it loads
   */
  const frameRef = useRef(null);

  useEffect(() => {
    const timeout = setTimeout(() => {
      // in case onLoad didn't fire, check visibility after some time
      if (frameRef.current?.style?.visibility === "hidden") {
        frameRef.current.style.visibility = "visible";
      }
    }, 60 * 1000);
    return () => clearTimeout(timeout);
  }, []);
  return (
    <Section className="bg-eerie block xl:hidden">
      <div className="w-full flex justify-center h-auto py-14">
        {/* // TODO Use this for Video */}
        {/* <iframe
          src={CONFIG.video.link}
          title={CONFIG.video.title}
          allow="autoplay; encrypted-media"
          className="border-none w-[90%] aspect-video mt-5 max-w-4xl"
          allowFullScreen
          ref={frameRef}
          onLoad={() => {
            if (frameRef.current) {
              frameRef.current.style.visibility = "visible";
            }
          }}
        /> */}
        <img
          className="mx-auto w-11/12 max-w-5xl rounded-2xl"
          src={SuperfeedImage}
          alt=""
        />
      </div>
    </Section>
  );
};

export default Video;
