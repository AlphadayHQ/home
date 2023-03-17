import ventures from "../../images/backers/image50.png";
import dfg from "../../images/backers/image52.png";
import jsquare from "../../images/backers/image53.png";
import kyber from "../../images/backers/image51.png";
import signum from "../../images/backers/image54.png";
import trader from "../../images/backers/image60.png";

import jordi from "../../images/contributors/jordi.svg";
import anthony from "../../images/contributors/anthony.svg";
import mariano from "../../images/contributors/mariano.svg";
import pierre from "../../images/contributors/pierre.svg";

const backers = [
  {
    id: "1",
    img: ventures,
    partner: "IOSG Ventures",
    link: "https://iosg.vc/",
    size: "w-[100px]",
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

  {
    id: "6",
    partner: "TechMeetsTrader",
    img: trader,
    link: "https://techmeetstrader.com/",
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
