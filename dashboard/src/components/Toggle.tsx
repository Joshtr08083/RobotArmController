import {useRef} from "react";

interface Props {
    textOn: string;
    textOff: string;
    state: boolean;
    onClick: (state: boolean) => void;
}

const Toggle = ({textOn, textOff, state, onClick} : Props) => {
  const lastPress = useRef(0);
  return (
    <button onClick={
      () => {
        if (performance.now() - lastPress.current > 200) {
          lastPress.current = performance.now();
          onClick(!state);
        }

      }
    }
    className={`toggleButton ${state? "ON" : "OFF"}`}
    >
      <p className="m-auto select-none">
        {state? textOn : textOff}
      </p>
    </button>
  )
}

export default Toggle