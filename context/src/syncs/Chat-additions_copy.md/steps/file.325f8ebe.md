---
timestamp: 'Wed Nov 05 2025 18:14:55 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251105_181455.488d6287.md]]'
content_id: 325f8ebe0a6aba637c997bb29915b6c14f4a242ba1a19a5e4f05957163f75770
---

# file: deno.json

```json
{
    "imports": {
        "@concepts/": "./src/concepts/",
        "@concepts": "./src/concepts/concepts.ts",
        "@test-concepts": "./src/concepts/test_concepts.ts",
        "@syncs": "./src/syncs/syncs.ts",
        "@utils/": "./src/utils/",
        "@engine": "./src/engine/mod.ts",
        "mongodb": "npm:mongodb@6.20.0",
        "@google/generative-ai": "npm:@google/generative-ai@0.24.1",
        "csv-parse/sync": "npm:csv-parse@5.6.0/sync",
        "@std/assert": "jsr:@std/assert@1",
        "@std/fs": "jsr:@std/fs@1",
        "@std/cli/parse-args": "jsr:@std/cli@1/parse-args",
        "@std/path/to-file-url": "jsr:@std/path@1/to-file-url",
        "@std/dotenv/load": "jsr:@std/dotenv@1/load",
        "@std/uuid/unstable-v7": "jsr:@std/uuid@1/unstable-v7",
        "hono": "jsr:@hono/hono@4"

    },
    "nodeModulesDir": "auto",
    
    "lint": {
        "rules": {
            "exclude": [
                "no-import-prefix",
                "no-unversioned-import"
            ]
        }
    }
,
    "tasks": {
        "start": "deno run --allow-net --allow-write --allow-read --allow-sys --allow-env src/main.ts",
        "concepts": "deno run --allow-net --allow-read --allow-sys --allow-env src/concept_server.ts --port 8000 --baseUrl /api",
        "import": "deno run --allow-read --allow-write --allow-env src/utils/generate_imports.ts",
        "build": "deno run import"
    }

}

```
