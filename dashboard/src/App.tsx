
import { useCallback } from 'react';
import useWebsockets from './api/useWebsockets'
import './App.css'
import { FullscreenButton } from './components/FullScreenButton'
import Motor from "./components/Motor"

const MOTOR_CONFIGS = [
  { id: "base",       lowBound: -800, highBound: 800,  start: 0, enabled: true },
  { id: "shoulder",   lowBound: 0,    highBound: 1300, start: 0, enabled: true },
  { id: "elbow",      lowBound: 80,   highBound: 170,  start: 125, enabled: true},
  { id: "wristPitch", lowBound: 55,   highBound: 145,  start: 100, enabled: true },
  { id: "wristRoll",  lowBound: 10,   highBound: 170,  start: 90, enabled: true },
  { id: "claw",       lowBound: 90,   highBound: 160,  start: 90, enabled: true},
];


function App() {
  const {status, lastMessage, sendMessage, initial} = useWebsockets();

  const updateMotor = useCallback((motorId: string, value: number | string) => {
    const msg = JSON.stringify({[motorId]: value});
    sendMessage(msg);
  }, [sendMessage]);


  return (
    <>
    <FullscreenButton />
    <div className="bodyContainer">
      <div className="sliderGrid">
        {MOTOR_CONFIGS.map(config => (
            <Motor
              key={config.id}
              {...config}
              incoming={lastMessage?.[config.id]}
              onChange={updateMotor}
              initial={initial?.[config.id]}
            />
          ))}
      </div>
    </div>
    </>
  )
}

export default App
