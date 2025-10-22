/**
 * LabelConcept Test Cases
 */
import process from "node:process";
import { main as testClear } from "./test-AI/label-clear.ts";
import { main as testMany } from "./test-AI/label-many-cats.ts";
import { main as testSubtle } from "./test-AI/label-subtle.ts";
import { main as testRealistic } from "./test-AI/label-realistic.ts";

/**
 * Main function to run all test cases
 */
async function main(): Promise<void> {
  console.log("🎓 Label Test Suite");
  console.log("========================\n");

  try {
    await testClear();

    await testMany();

    await testSubtle();

    await testRealistic();
    console.log("\n🎉 All test cases completed successfully!");
  } catch (error) {
    console.error("❌ Test error:", (error as Error).message);
    process.exit(1);
  }
}

// Run the tests if this file is executed directly
if (import.meta.main) await main();
