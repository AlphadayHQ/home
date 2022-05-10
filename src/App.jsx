import { useState } from 'react'
import HomeContainer from './containers/HomeContainer'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <HomeContainer/>
    </>
  )
}

export default App
