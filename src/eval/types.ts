export interface EvalSpec {
  tests: TestCase[];
}

export interface TestCase {
  name: string;
  input: string;
  assert: AssertionDef[];
}

export type AssertionDef =
  | { contains: string }
  | { "not-contains": string }
  | { "starts-with": string }
  | { "ends-with": string }
  | { "min-length": number }
  | { "max-length": number }
  | { matches: string };

export interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  output?: string;
  failureReason?: string;
  timeout?: boolean;
  regression?: boolean;
}

export interface SkillEvalResult {
  skillName: string;
  skillHash: string;
  tests: TestResult[];
}

export interface EvalSummary {
  skills: SkillEvalResult[];
  passed: number;
  failed: number;
  regressions: number;
  totalDuration: number;
}

export interface BaselineData {
  timestamp: string;
  skill: string;
  hash: string;
  results: Array<{
    name: string;
    passed: boolean;
    duration: number;
  }>;
}
