import React from 'react'
import { Footer, Navbar } from '../components';
import { Hero, Partners, Team, FAQ, Getfeatures, Workflow } from '../components/home';
import {Layout, Nav} from "../shared";

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
