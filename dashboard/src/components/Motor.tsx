import { useState, useEffect} from "react"

import Slider from "./Slider"
import Toggle from "./Toggle"
import Button from "./Button"

interface Props {
    id: string;
    lowBound: number;
    highBound: number;
    start: number;
    incoming: number;
    onChange: (id: string, value: number | string) => void;
    initial: any;
}

const Motor = ({id, lowBound, highBound, start, incoming, onChange, initial} : Props) => {

    const [isEnabled, setIsEnabled] = useState(true);
    const [pos, setPos] = useState(start);

    const onToggle = (newState: boolean) => {
        setIsEnabled(newState);
        onChange(id, (newState? "enable" : "disable"));
    }

    const onPosChange = (newPos: number) => {
        setPos(newPos);
        onChange(id, newPos);
    }

    const onReset = () => {
        onPosChange(start);
    }

    useEffect(() => {
        if (incoming !== undefined) {
            if (typeof incoming === "number") {
                setPos(incoming);
            } else if (incoming === "enable") {
                setIsEnabled(true);
            } else if (incoming === "disable") {
                setIsEnabled(false);
            }
        }
    }, [incoming])

    useEffect(() => {
        if (initial !== undefined) {
            if (initial?.value !== undefined) setPos(initial.value);
            if (initial?.enabled !== undefined) setIsEnabled(initial.enabled);
        }
    }, [initial])

    return (
        <div
            className="flex flex-col w-full gap-3"
        >
            <strong><p className="justify-self-left select-none">
                {id.toUpperCase()}
            </p></strong>
            <Slider min={lowBound} max={highBound} value={pos} onChange={onPosChange} />
            <div className="flex flex-row w-full justify-center">
                <div className="buttonPanel">
                    <Toggle textOn="✓" textOff="X" state={isEnabled} onClick={onToggle} />
                    <Button text="RESET" onClick={onReset} />
                </div>
            </div>
        </div>
  )
}

export default Motor