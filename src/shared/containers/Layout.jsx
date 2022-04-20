import React, { Children } from 'react'
import { Navbar, Footer } from "../../components";

function Layout({ children }) {
  return (
    <div>
      <Navbar/>
      <div className="absolute top-0 left-0 w-full">
        {children}
      </div>
      <Footer/>
    </div>
  )
}

export default Layout;