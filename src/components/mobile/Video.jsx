import React, { useEffect, useRef } from "react";
import { Section } from "../../shared";
import CONFIG from "../../config";

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
    <Section>
      <div className="w-full flex justify-center h-auto my-14">
        <iframe
          src={CONFIG.video.link}
          title={CONFIG.video.title}
          allow="autoplay; encrypted-media"
          className="border-none w-[80%] aspect-video mt-5"
          style={{
            height: "220px",
            visibility: "hidden",
          }}
          allowFullScreen
          ref={frameRef}
          onLoad={() => {
            if (frameRef.current) {
              frameRef.current.style.visibility = "visible";
            }
          }}
        />
      </div>
    </Section>
  );
};

export default Video;
