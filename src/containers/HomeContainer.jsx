import React from 'react'
import { Footer, Navbar } from '../components';
import { Hero, Partners } from '../components/home';
import {Layout} from "../shared";

function HomeContainer() {
  return (
    <Layout>      
      <Hero/>
      <Partners/>
    </Layout>
  )
}

export default HomeContainer;
