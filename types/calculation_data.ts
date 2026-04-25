import CalculationStep from "./calculation_step"
import CalculationSource from "./calculation_source"

export default interface CalculationData {
  steps: CalculationStep[];
  source: CalculationSource[];
}
