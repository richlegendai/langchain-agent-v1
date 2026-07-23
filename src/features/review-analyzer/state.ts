import type { ReviewResultEvent, SidecarEvent } from "../../lib/contracts";

export type AnalysisState = Readonly<{
  jobId: string | null;
  running: boolean;
  total: number;
  succeeded: number;
  failed: number;
  results: Readonly<Record<string, ReviewResultEvent>>;
  fatalError: string | null;
}>;

export const initialAnalysisState: AnalysisState = {
  jobId: null,
  running: false,
  total: 0,
  succeeded: 0,
  failed: 0,
  results: {},
  fatalError: null,
};

type AnalysisAction =
  | Readonly<{ type: "started"; jobId: string; total: number }>
  | Readonly<{ type: "retrying"; jobId: string }>
  | Readonly<{ type: "local_error"; message: string }>
  | Readonly<{ type: "event"; event: SidecarEvent }>;

function countResults(results: Readonly<Record<string, ReviewResultEvent>>) {
  const values = Object.values(results);
  return {
    succeeded: values.filter((result) => result.status === "succeeded").length,
    failed: values.filter((result) => result.status === "failed").length,
  };
}

export function analysisReducer(state: AnalysisState, action: AnalysisAction): AnalysisState {
  switch (action.type) {
    case "started":
      return { ...initialAnalysisState, jobId: action.jobId, running: true, total: action.total };
    case "retrying":
      return { ...state, jobId: action.jobId, running: true, fatalError: null };
    case "local_error":
      return { ...state, running: false, fatalError: action.message };
    case "event": {
      switch (action.event.event) {
        case "job_started":
          return state;
        case "review_result": {
          const results = { ...state.results, [action.event.review_id]: action.event };
          return { ...state, ...countResults(results), results };
        }
        case "job_finished":
          return { ...state, running: false };
        case "fatal_error":
          return { ...state, running: false, fatalError: action.event.error.message };
      }
    }
  }
}
