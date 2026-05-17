import TrialRunner from "@/app/components/TrialRunner";
import rankingTrials from "@/lib/ranking.json";

export default function RankingPage() {
  return (
    <TrialRunner
      trials={rankingTrials}
      title="You see two robots doing a simple task."
      subtitle="Both robots are controlled by AI, but using different methods. Can you select the robot that looks more human?"
      testType="ranking"
    />
  );
}
