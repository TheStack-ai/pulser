import type { AssertionDef } from "./types.js";

interface AssertionResult {
  passed: boolean;
  failureReason?: string;
}

export function runAssertions(output: string, assertions: AssertionDef[]): AssertionResult {
  for (const assertion of assertions) {
    if ("contains" in assertion) {
      if (!output.includes(assertion.contains)) {
        return { passed: false, failureReason: `expected contains "${assertion.contains}", not found` };
      }
    } else if ("not-contains" in assertion) {
      if (output.includes(assertion["not-contains"])) {
        return { passed: false, failureReason: `expected not-contains "${assertion["not-contains"]}", found in output` };
      }
    } else if ("starts-with" in assertion) {
      if (!output.startsWith(assertion["starts-with"])) {
        return { passed: false, failureReason: `expected starts-with "${assertion["starts-with"]}"` };
      }
    } else if ("ends-with" in assertion) {
      if (!output.endsWith(assertion["ends-with"])) {
        return { passed: false, failureReason: `expected ends-with "${assertion["ends-with"]}"` };
      }
    } else if ("min-length" in assertion) {
      if (output.length < assertion["min-length"]) {
        return { passed: false, failureReason: `expected min-length ${assertion["min-length"]}, got ${output.length}` };
      }
    } else if ("max-length" in assertion) {
      if (output.length > assertion["max-length"]) {
        return { passed: false, failureReason: `expected max-length ${assertion["max-length"]}, got ${output.length}` };
      }
    } else if ("matches" in assertion) {
      let re: RegExp;
      try {
        re = new RegExp(assertion.matches);
      } catch {
        return { passed: false, failureReason: `invalid regex "${assertion.matches}"` };
      }
      if (!re.test(output)) {
        return { passed: false, failureReason: `expected matches "${assertion.matches}", no match` };
      }
    } else {
      const key = Object.keys(assertion)[0] ?? "unknown";
      return { passed: false, failureReason: `unknown assertion type "${key}"` };
    }
  }
  return { passed: true };
}
