import ReportGate from "@/components/ReportGate";
import { LLMReportContent } from "@/components/LLMReportContent";

const HERO_PORTOFINO = "https://ferrari-cdn.thron.com/delivery/public/image/ferrari/portofino/3zayf6/std/0x0/portofino.jpg?quality=auto-high&format=auto";

export default function FerrariPortofinoReport() {
  return (
    <ReportGate modelKey="portofino" modelLabel="Ferrari Portofino" heroImageUrl={HERO_PORTOFINO}>
      <LLMReportContent modelKey="portofino" />
    </ReportGate>
  );
}
