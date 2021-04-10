import { RadialChart } from "react-vis";

interface IProps {
  data: any[]
}

export default function PieChart({ data }: IProps) {
  
  return (
    <RadialChart
      data={data}
      width={130}
      height={130}
      showLabels
    />
  )
}