export type EinsteinStatus = "idle" | "loading" | "success" | "error";

export interface SafetyScores {
  safetyScore: number;
  toxicityScore: number;
  hateScore: number;
  violenceScore: number;
  physicalScore: number;
  sexualScore: number;
  profanityScore: number;
}

export interface EinsteinState {
  status: EinsteinStatus;
  text: string | null;
  safetyScores: SafetyScores | null;
  error: string | null;
}

export const EINSTEIN_INITIAL_STATE: EinsteinState = {
  status: "idle",
  text: null,
  safetyScores: null,
  error: null,
};
