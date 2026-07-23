import { useState } from "react";

import { Launcher } from "./features/launcher/Launcher";
import { ReviewAnalyzer } from "./features/review-analyzer/ReviewAnalyzer";

type View = "launcher" | "review-analyzer";

export function App() {
  const [view, setView] = useState<View>("launcher");

  switch (view) {
    case "launcher":
      return <Launcher onOpenReviewAnalyzer={() => setView("review-analyzer")} />;
    case "review-analyzer":
      return <ReviewAnalyzer onBack={() => setView("launcher")} />;
  }
}
