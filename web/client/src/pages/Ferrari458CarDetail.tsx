// @ts-nocheck
import GenericCarDetail from "./GenericCarDetail";
import { CARS_458_BY_RANK } from "@/data/ferrari458";
import { WEIGHTS_458, WEIGHT_LABELS_458, WEIGHT_EVIDENCE_458 } from "@/data/f458-weights";
import type { CarDetailData } from "./GenericCarDetail";

const CHECKLIST_LABELS_458: Record<string, string> = {
  preGpf: "Pre-GPF (Pre-2016)",
  lowMileage: "Low Mileage (<10k mi)",
  ffsh: "Full Ferrari Service History",
  accidentFree: "Accident Free",
  carbonPack: "Carbon Exterior Pack",
  daytonaSeats: "Daytona Racing Seats",
  frontLift: "Front Suspension Lift",
  scuderiaShields: "Scuderia Shields",
  ccb: "Carbon-Ceramic Brakes",
  originalColour: "Desirable / Original Colour",
};

// Normalise 458 cars to CarDetailData shape
const CARS_458_NORMALISED: CarDetailData[] = (CARS_458_BY_RANK as any[]).map((c) => ({
  ...c,
  modelName: "Ferrari 458 Italia",
  modelKey: "458-italia",
}));

export default function Ferrari458CarDetail() {
  return (
    <GenericCarDetail
      cars={CARS_458_NORMALISED}
      modelName="Ferrari 458 Italia"
      reportRoute="/458-italia"
      reportLabel="458 Italia Analysis"
      weights={WEIGHTS_458}
      weightLabels={WEIGHT_LABELS_458}
      weightEvidence={WEIGHT_EVIDENCE_458 as any}
      checklistLabels={CHECKLIST_LABELS_458}
      expectedModelKey="458-italia"
    />
  );
}
