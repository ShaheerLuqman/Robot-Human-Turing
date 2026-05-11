import TrialRunner from "@/app/components/TrialRunner";
import rankingTrials from "@/lib/ranking.json";

export default function RankingPage() {
  return (
    <TrialRunner
      trials={rankingTrials}
      title="Ranking Test"
      subtitle="Which video looks more human? Click it, then submit."
      testType="ranking"
    />
  );
}
