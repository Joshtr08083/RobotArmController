import {useRef, useState} from 'react'

interface Props {
    text: string;
    onClick: () => void;
}

const Button = ({text, onClick} : Props) => {
    const [clicked, setClicked] = useState(false);
    const clearClicked = useRef(0);
    const lastPress = useRef(0);

    return (
        <button
            className={`genericButton ${clicked? "clicked" : ""}`}

            onClick={
                ()=>{
                    if (performance.now() - lastPress.current > 550) {
                        lastPress.current = performance.now()
                        setClicked(true);
                        clearTimeout(clearClicked.current);
                        clearClicked.current = setTimeout(() => {
                            setClicked(false);
                        }, 500);
                        onClick();
                    }
                }
            }
        >
            {text}
        </button>
    )
}

export default Button