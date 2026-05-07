// @ts-nocheck
import GenericCarDetail from "./GenericCarDetail";
import {
  CARS_F8_BY_RANK as F8_CARS_BY_RANK,
} from "@/data/f8tributo";
import { F8_WEIGHTS, F8_WEIGHT_LABELS, F8_WEIGHT_EVIDENCE } from "@/data/f8-weights";
import type { CarDetailData } from "./GenericCarDetail";

const F8_CHECKLIST_LABELS: Record<string, string> = {
  carbonDriverZone: "Carbon Driver Zone Pack",
  suspensionLift: "Front Suspension Lift",
  daytonaSeats: "Daytona Racing Seats",
  specialColour: "Special / Tailor Made Colour",
  carbonCeramicBrakes: "Carbon-Ceramic Brakes (Std)",
  lowMileage: "Low Mileage (<5k mi)",
  ferrariApproved: "Ferrari Approved",
  atelierCommission: "Atelier Commission",
  singleOwner: "Single Owner",
  fullFerrariServiceHistory: "Full Ferrari Service History",
  cleanHpiAccidentFree: "Accident Free (HPI Clear)",
  magnetorheologicalSuspension: "MagneRide Suspension",
  passengerDisplay: "Passenger Display",
};

// Normalise F8 cars to CarDetailData shape
const F8_CARS_NORMALISED: CarDetailData[] = (F8_CARS_BY_RANK as any[]).map((c) => ({
  ...c,
  modelName: "Ferrari F8 Tributo",
  modelKey: "f8-tributo",
}));

export default function F8CarDetail() {
  return (
    <GenericCarDetail
      cars={F8_CARS_NORMALISED}
      modelName="Ferrari F8 Tributo"
      reportRoute="/f8-tributo"
      reportLabel="F8 Tributo Analysis"
      weights={F8_WEIGHTS}
      weightLabels={F8_WEIGHT_LABELS}
      weightEvidence={F8_WEIGHT_EVIDENCE as any}
      checklistLabels={F8_CHECKLIST_LABELS}
      expectedModelKey="f8-tributo"
    />
  );
}
