import React from 'react'
import { Footer, Navbar } from '../components';
import { Hero, Partners, Backers, Team, FAQ, Blog, Getfeatures, Workflow } from '../components/home';

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
      <Blog />
      <Getfeatures />
      <Footer />
    </>
  );
}

export default HomeContainer;
