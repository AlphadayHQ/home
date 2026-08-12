import member1 from "../../images/team/member-1.jpg";
import member3 from "../../images/team/member-3.jpg";
import member4 from "../../images/team/member-4.jpg";
import member5 from "../../images/team/member-5.jpg";
import member6 from "../../images/team/member-6.jpg";
import member7 from "../../images/team/member-7.jpg";
import member9 from "../../images/team/member-9.jpg";
import member10 from "../../images/team/member-10.jpg";

/**
 * For every team member card the the info tooltip is
 * positioned differently for mobile (you don't want the tooltip
 * to go out of the screen especially cards on the edged).
 *
 * So the position & size styles are constant while the team members
 * data are shuffled.
 */
export const teamData = [
  {
    img: member1,
    name: "Gideon Anyalewechi",
    position: "Developer",
    twitter: "https://twitter.com/get_giddy",
    linkedin: "https://www.linkedin.com/in/getgiddy/",
  },
  {
    img: member3,
    name: "Felipe Faraggi",
    position: "Co-Founder & CTO",
    twitter: "https://twitter.com/felipefaraggi",
    linkedin: "https://www.linkedin.com/in/faraggi/",
  },
  {
    img: member4,
    name: "Vicente Almonacid",
    position: "Software Engineer",
    twitter: "https://twitter.com/v_almonacid",
    linkedin: "https://www.linkedin.com/in/vicente-almonacid/",
  },
  {
    img: member5,
    name: "Pablo Palomo",
    position: "Technical Lead",
    twitter: "https://twitter.com/ppalomo",
    linkedin: "https://www.linkedin.com/in/pablo-palomo-07127711/",
  },
  {
    img: member6,
    name: "Deniz Omer",
    position: "Co-Founder & CEO",
    twitter: "https://twitter.com/DenizOmer",
    linkedin: "https://www.linkedin.com/in/denizomer/",
  },
  {
    img: member7,
    name: "Charles Nwankwo",
    position: "Developer",
    twitter: "https://twitter.com/Chadnium",
    linkedin: "https://www.linkedin.com/in/charles-nwankwo-01/",
  },
  {
    img: member9,
    name: "Jonathan Irhodia",
    position: "Developer",
    twitter: "https://twitter.com/iamelcharitas",
    linkedin: "https://linkedin.com/in/elcharitas",
  },
  {
    img: member10,
    name: "Mikael Hagopian",
    position: "QA and Analyst",
    twitter: "https://twitter.com/MikeJa33",
    linkedin: "https://www.linkedin.com/in/mikael-h-87bb4ba4/",
  },
];

export const positionData = [
  {
    id: 1,
    classnames: "rounded-[13px] sm:rounded-[26px] w-[63px]  sm:w-[158px]",
    infoPosClassnames:
      "left-[30%] bottom-[-140%] sm:bottom-[-35%] lg:bottom-auto lg:left-[70%]",
  },
  // {
  //   id: 2,
  //   classnames: "rounded-[13px] sm:rounded-[26px] w-[73px] sm:w-[183px]",
  //   infoPosClassnames:
  //     "-bottom-full sm:bottom-[-35%] lg:bottom-auto lg:left-[70%]",
  // },
  {
    id: 3,
    classnames: "rounded-[13px] sm:rounded-[26px] w-[73px] sm:w-[183px]",
    infoPosClassnames:
      "-bottom-full sm:bottom-[-35%] lg:bottom-auto lg:left-[70%]",
  },
  {
    id: 4,
    classnames: "rounded-[13px] sm:rounded-[26px] w-[60px] sm:w-[151px]",
    infoPosClassnames:
      "bottom-[-120%] sm:bottom-[-35%] lg:bottom-auto lg:left-[70%]",
  },
  {
    id: 5,
    classnames: "rounded-[13px] sm:rounded-[26px] w-[63px]  sm:w-[168px]",
    infoPosClassnames:
      "right-[30%] bottom-[-140%] sm:bottom-[-15%] lg:bottom-auto lg:left-[70%]",
  },
  {
    id: 6,
    classnames: "rounded-[13px] sm:rounded-[26px] w-[63px]  sm:w-[158px]",
    infoPosClassnames:
      "left-[30%] -bottom-full sm:bottom-[-35%] lg:bottom-auto lg:left-[70%]",
  },
  {
    id: 7,
    classnames: "rounded-[13px] sm:rounded-[26px] w-[60px] sm:w-[151px]",
    infoPosClassnames:
      "bottom-[-120%] sm:bottom-[-35%] lg:bottom-auto lg:left-[70%]",
  },
  // {
  //   id: 8,
  //   classnames: "rounded-[13px] sm:rounded-[26px] w-[73px] sm:w-[183px]",
  //   infoPosClassnames:
  //     "bottom-[-80%] sm:bottom-[-35%] lg:bottom-auto lg:left-[70%]",
  // },
  {
    id: 9,
    classnames: "rounded-[13px] sm:rounded-[26px] w-[60px] sm:w-[168px]",
    infoPosClassnames:
      "bottom-[-120%] sm:bottom-[-35%] lg:bottom-auto lg:left-[70%]",
  },
  {
    id: 10,
    classnames: "rounded-[13px] sm:rounded-[26px] w-[60px] sm:w-[158px]",
    infoPosClassnames:
      "bottom-[-120%] sm:bottom-[-35%] lg:bottom-auto lg:left-[70%]",
  },
];

// Copies before shuffling — this runs during render against the imported
// teamData, and reordering a module-level array in place makes the output
// depend on how many times the component has rendered.
export const shuffleArray = (a) => {
  const shuffled = [...(a || [])];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]; // The shuffle
  }
  return shuffled;
};

/**
 * Pairs each layout position with a randomly assigned member.
 *
 * Positions get commented in and out of positionData as the team changes, so
 * the two arrays cannot be assumed to be the same length: pair as far as the
 * members go and drop the rest. Always returns an array — the caller slices it.
 */
export const shuffleTeam = (teamData, positionData) => {
  const members = shuffleArray(teamData);

  return (positionData || [])
    .map((position, i) => (members[i] ? { ...position, ...members[i] } : null))
    .filter(Boolean);
};
