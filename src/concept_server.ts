import { Hono } from "jsr:@hono/hono";
import { getDb } from "@utils/database.ts";
import { walk } from "jsr:@std/fs";
import { parseArgs } from "jsr:@std/cli/parse-args";
import { toFileUrl } from "jsr:@std/path/to-file-url";

// Parse command-line arguments for port and base URL
const flags = parseArgs(Deno.args, {
  string: ["port", "baseUrl"],
  default: {
    port: "8000",
    baseUrl: "/api",
  },
});

const PORT = parseInt(flags.port, 10);
const BASE_URL = flags.baseUrl;
const CONCEPTS_DIR = "src/concepts";

/**
 * Main server function to initialize DB, load concepts, and start the server.
 */
async function main() {
  const [db] = await getDb();
  const app = new Hono();

  app.get("/", (c) => c.text("Concept Server is running."));

  // --- Dynamic Concept Loading and Routing ---
  console.log(`Scanning for concepts in ./${CONCEPTS_DIR}...`);

  // Manually instantiate concepts to handle dependencies
  const concepts: { [key: string]: any } = {};
  const labelModule = await import(
    toFileUrl(
      Deno.realPathSync(`${CONCEPTS_DIR}/Label/LabelConcept.ts`),
    ).href
  );
  const labelConcept = new labelModule.default(db);
  concepts["Label"] = labelConcept;

  const categoryModule = await import(
    toFileUrl(
      Deno.realPathSync(`${CONCEPTS_DIR}/Category/CategoryConcept.ts`),
    ).href
  );
  const categoryConcept = new categoryModule.default(db, labelConcept);
  concepts["Category"] = categoryConcept;

  for await (
    const entry of walk(CONCEPTS_DIR, {
      maxDepth: 1,
      includeDirs: true,
      includeFiles: false,
    })
  ) {
    if (entry.path === CONCEPTS_DIR) continue; // Skip the root directory

    const conceptName = entry.name;
    if (concepts[conceptName]) {
      // Already loaded
      continue;
    }

    const conceptFilePath = `${entry.path}/${conceptName}Concept.ts`;

    try {
      const modulePath = toFileUrl(Deno.realPathSync(conceptFilePath)).href;
      const module = await import(modulePath);
      const ConceptClass = module.default;

      if (
        typeof ConceptClass !== "function" ||
        !ConceptClass.name.endsWith("Concept")
      ) {
        console.warn(
          `! No valid concept class found in ${conceptFilePath}. Skipping.`,
        );
        continue;
      }

      const instance = new ConceptClass(db);
      concepts[conceptName] = instance;
    } catch (e) {
      console.error(
        `! Error loading concept from ${conceptFilePath}:`,
        e,
      );
    }
  }

  for (const conceptName in concepts) {
    const instance = concepts[conceptName];
    const conceptApiName = conceptName;
    console.log(
      `- Registering concept: ${conceptName} at ${BASE_URL}/${conceptApiName}`,
    );

    const methodNames = Object.getOwnPropertyNames(
      Object.getPrototypeOf(instance),
    )
      .filter((name) =>
        name !== "constructor" && typeof instance[name] === "function"
      );

    for (const methodName of methodNames) {
      const actionName = methodName;
      const route = `${BASE_URL}/${conceptApiName}/${actionName}`;

      app.post(route, async (c) => {
        try {
          const body = await c.req.json().catch(() => ({})); // Handle empty body
          const result = await instance[methodName](body);
          return c.json(result);
        } catch (e) {
          console.error(`Error in ${conceptName}.${methodName}:`, e);
          return c.json({ error: "An internal server error occurred." }, 500);
        }
      });
      console.log(`  - Endpoint: POST ${route}`);
    }
  }

  console.log(`\nServer listening on http://localhost:${PORT}`);
  Deno.serve({ port: PORT }, app.fetch);
}

// Run the server
main();
