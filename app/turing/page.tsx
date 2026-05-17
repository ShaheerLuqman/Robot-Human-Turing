import TrialRunner from "@/app/components/TrialRunner";
import turingTrials from "@/lib/turing.json";

export default function TuringPage() {
  return (
    <TrialRunner
      trials={turingTrials}
      title="You see two robots doing a simple task."
      subtitle="One of these robots was being remote-controlled by a human (one of our researchers), and the other is being controlled by AI. Can you guess and select the robot which is controlled by human?"
      testType="turing"
    />
  );
}
