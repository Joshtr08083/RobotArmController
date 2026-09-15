
interface Props {
  min: number;
  max: number;
  value: number;
  onChange: (newPos: number) => void;
}

const Slider = ({ min, max, value, onChange }: Props) => {


  return (
    <input
      type="range"
      min={min}
      max={max}
      value={value}
      className="range w-full justify-self-center"
      onChange={(e) => {
        const v = Number(e.target.value);
        onChange(v);
      }}
    />
  );
};

export default Slider;