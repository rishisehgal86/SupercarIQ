import ReportGate from "@/components/ReportGate";
import { LLMReportContent } from "@/components/LLMReportContent";

const HERO_ROMA = "https://ferrari-cdn.thron.com/delivery/public/image/ferrari/roma/3zayf6/std/0x0/roma.jpg?quality=auto-high&format=auto";

export default function FerrariRomaReport() {
  return (
    <ReportGate modelKey="roma" modelLabel="Ferrari Roma" heroImageUrl={HERO_ROMA}>
      <LLMReportContent modelKey="roma" />
    </ReportGate>
  );
}
