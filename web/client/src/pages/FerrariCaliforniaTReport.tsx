import ReportGate from "@/components/ReportGate";
import { LLMReportContent } from "@/components/LLMReportContent";

const HERO_CALI = "https://ferrari-cdn.thron.com/delivery/public/image/ferrari/california-t/3zayf6/std/0x0/california-t.jpg?quality=auto-high&format=auto";

export default function FerrariCaliforniaTReport() {
  return (
    <ReportGate modelKey="california-t" modelLabel="Ferrari California T" heroImageUrl={HERO_CALI}>
      <LLMReportContent modelKey="california-t" />
    </ReportGate>
  );
}
