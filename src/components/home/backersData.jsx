import ventures from "../../images/backers/image50.webp";
import dfg from "../../images/backers/image52.webp";
import jsquare from "../../images/backers/image53.webp";
import kyber from "../../images/backers/image51.webp";
import signum from "../../images/backers/image54.webp";
import trader from "../../images/backers/image60.webp";

import jordi from "../../images/contributors/jordi.webp";
import anthony from "../../images/contributors/anthony.webp";
import mariano from "../../images/contributors/mariano.webp";
import pierre from "../../images/contributors/pierre.webp";
import hashkey from "../../images/backers/hashkey.webp";

const backers = [
  {
    id: "1",
    img: ventures,
    partner: "IOSG Ventures",
    link: "https://iosg.vc/",
    size: "w-[100px]",
  },
  {
    id: "7",
    partner: "HashKey Capital",
    img: hashkey,
    link: "https://hashkey.capital/",
    size: "w-[114px]",
  },

  {
    id: "2",
    partner: "Kyber Network",
    img: kyber,
    link: "https://www.kyber.ventures/",
    size: "w-[100px]",
  },

  {
    id: "3",
    partner: "Signum Capital",
    img: signum,
    link: "https://www.signum.capital/",
    size: "w-[114px]",
  },

  {
    id: "4",
    partner: "DFG",
    img: dfg,
    link: "https://dfg.group/",
    size: "w-[100px]",
  },

  {
    id: "5",
    partner: "Jsquare",
    img: jsquare,
    link: "https://www.jsquare.co/",
    size: "w-[114px]",
  },
];

const contributors = [
  {
    id: "1",
    img: jordi,
    contributor: "Jordi Alexander",
    handle: "@gametheorizing",
    link: "https://twitter.com/gametheorizing",
  },

  {
    id: "2",
    img: anthony,
    contributor: "Anthony Sassano",
    handle: "@sassal0x",
    link: "https://twitter.com/sassal0x",
  },

  {
    id: "3",
    img: mariano,
    contributor: "Mariano Conti",
    handle: "@nanexcool",
    link: "https://twitter.com/nanexcool",
  },

  {
    id: "4",
    img: pierre,
    contributor: "Pierre Laurent",
    handle: "@pierrelaurent",
    link: "https://www.linkedin.com/in/pierrelaurent789/",
  },
];

export { backers, contributors };
