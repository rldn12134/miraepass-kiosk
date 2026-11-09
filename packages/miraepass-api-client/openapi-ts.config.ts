import { defineConfig } from "@hey-api/openapi-ts";

export default defineConfig({
    input: "http://localhost:8000/openapi.json",
    output: "src/gen",
    plugins: [
        {
            name: "@hey-api/typescript",
            enums: "javascript",
        },
        {
            name: "@hey-api/client-ofetch",
            runtimeConfigPath: "./src/client.config",
        },
        {
            name: "@hey-api/sdk",
            transformer: true,
            validator: true,
            operations: {
                containerName: "MiraepassAPI",
                strategy: "single",
            },
        },
        {
            name: "zod",
            dates: {
                offset: true
            }
        },
        "@hey-api/transformers",
        "@hey-api/schemas",
    ],
});
