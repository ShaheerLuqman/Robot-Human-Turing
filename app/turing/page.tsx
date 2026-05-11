import TrialRunner from "@/app/components/TrialRunner";
import turingTrials from "@/lib/turing.json";

export default function TuringPage() {
  return (
    <TrialRunner
      trials={turingTrials}
      title="Turing Test"
      subtitle="Which video is human-generated? Click it, then submit."
      testType="turing"
    />
  );
}
