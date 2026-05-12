import ReportGate from "@/components/ReportGate";
import { LLMReportContent } from "@/components/LLMReportContent";

const HERO_488 = "https://ferrari-cdn.thron.com/delivery/public/image/ferrari/488-gtb/3zayf6/std/0x0/488-gtb.jpg?quality=auto-high&format=auto";

export default function Ferrari488Report() {
  return (
    <ReportGate modelKey="488-gtb" modelLabel="Ferrari 488 GTB" heroImageUrl={HERO_488}>
      <LLMReportContent modelKey="488-gtb" />
    </ReportGate>
  );
}
