// @ts-nocheck
import GenericCarDetail from "./GenericCarDetail";
import { CARS_812GTS_BY_RANK as GTS_CARS_BY_RANK } from "@/data/ferrari812gts";
import { GTS_WEIGHTS, GTS_WEIGHT_LABELS, GTS_WEIGHT_EVIDENCE } from "@/data/gts-weights";
import type { CarDetailData } from "./GenericCarDetail";

const GTS_CHECKLIST_LABELS: Record<string, string> = {
  lowMileage: "Low Mileage (<5k mi)",
  ffsh: "Full Ferrari Service History",
  accidentFree: "Accident Free",
  carbonPack: "Carbon Exterior Pack",
  daytonaSeats: "Daytona Racing Seats",
  frontLift: "Front Suspension Lift",
  ccb: "Carbon-Ceramic Brakes (Std)",
  magnetorheological: "MagneRide Dampers (Std)",
  tailorMade: "Tailor Made Commission",
  retractableHardtop: "Retractable Hardtop ✓",
};

// Normalise GTS cars to CarDetailData shape
const GTS_CARS_NORMALISED: CarDetailData[] = (GTS_CARS_BY_RANK as any[]).map((c) => ({
  ...c,
  modelName: "Ferrari 812 GTS",
  modelKey: "812-gts",
  checklistLabels: GTS_CHECKLIST_LABELS,
}));

export default function Ferrari812GTSCarDetail() {
  return (
    <GenericCarDetail
      cars={GTS_CARS_NORMALISED}
      modelName="Ferrari 812 GTS"
      reportRoute="/812-gts"
      reportLabel="812 GTS Analysis"
      weights={GTS_WEIGHTS}
      weightLabels={GTS_WEIGHT_LABELS}
      weightEvidence={GTS_WEIGHT_EVIDENCE as any}
      checklistLabels={GTS_CHECKLIST_LABELS}
      expectedModelKey="812-gts"
    />
  );
}
