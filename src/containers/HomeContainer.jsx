import React from 'react'
import { Footer, Navbar } from '../components';
import { Hero, Partners, Backers, Team, FAQ, Getfeatures, Workflow, BoardLinks } from '../components/home';

function HomeContainer() {
  return (
    <>
      <Navbar />
      <Hero />
      <Workflow />
      <Partners />
      <Backers />
      <Team />
      <BoardLinks />
      <FAQ />
      <Getfeatures />
      <Footer />
    </>
  );
}

export default HomeContainer;
