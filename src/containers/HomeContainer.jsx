import React from 'react'
import { Footer, Navbar } from '../components';
import { Hero, Partners, Backers, Team, FAQ, Getfeatures, Workflow } from '../components/home';

function HomeContainer() {
  return (
    <>
      <Navbar />
      <Hero />
      <Workflow />
      <Partners />
      <Backers />
      <Team />
      <FAQ />
      <Getfeatures />
      <Footer />
    </>
  );
}

export default HomeContainer;
