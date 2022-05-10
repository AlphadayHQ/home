import React from 'react'
import { Footer, Navbar } from '../components';
import { Hero, Partners, Team, FAQ, Getfeatures, Workflow } from '../components/home';

function HomeContainer() {
  return (
    <>  
      <Navbar/>   
      <Hero/>
      <Workflow/>
      <Partners/>
      <Team/>
      <FAQ/>
      <Getfeatures/>
      <Footer/>
    </>
  )
}

export default HomeContainer;
