#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { listPages, readPage, searchPages, getFunction } from "./tools.js";

const VERSION = "0.1.0";

const TOOL_DEFS = [
    {
        name: "list_pages",
        description:
            "List every page in the Serotonin Lua API docs. Returns an array of " +
            "{slug, title, section} records. Use this first to discover what is available, " +
            "then call read_page or get_function to drill in.",
        inputSchema: {
            type: "object",
            properties: {
                locale: {
                    type: "string",
                    enum: ["en", "ru"],
                    default: "en",
                    description: "Documentation locale. 'en' is the canonical text.",
                },
            },
            additionalProperties: false,
        },
    },
    {
        name: "read_page",
        description:
            "Return the full markdown body of one Serotonin Lua API doc page. " +
            "The slug is the same string returned by list_pages, e.g. 'libraries/memory' or 'userdata/Vector3'.",
        inputSchema: {
            type: "object",
            properties: {
                slug: { type: "string" },
                locale: { type: "string", enum: ["en", "ru"], default: "en" },
            },
            required: ["slug"],
            additionalProperties: false,
        },
    },
    {
        name: "search_pages",
        description:
            "Substring search across every page. Returns matching pages with a short snippet of the surrounding text. " +
            "Cheaper than fetching every page yourself; use it to locate the right page before read_page.",
        inputSchema: {
            type: "object",
            properties: {
                query: { type: "string" },
                locale: { type: "string", enum: ["en", "ru"], default: "en" },
            },
            required: ["query"],
            additionalProperties: false,
        },
    },
    {
        name: "get_function",
        description:
            "Pull just one function's section from a library page (e.g. memory.Read, utility.GetTickCount, ui.SetValue). " +
            "Returns the markdown subset under the `## ` heading for that function. " +
            "library is either a bare library name ('memory') or a full slug ('libraries/memory', 'userdata/Vector3').",
        inputSchema: {
            type: "object",
            properties: {
                library: { type: "string" },
                name: { type: "string" },
                locale: { type: "string", enum: ["en", "ru"], default: "en" },
            },
            required: ["library", "name"],
            additionalProperties: false,
        },
    },
];

async function main(): Promise<void> {
    const server = new Server(
        { name: "mcp-serotonin-docs", version: VERSION },
        { capabilities: { tools: {} } }
    );

    server.setRequestHandler(ListToolsRequestSchema, async () => ({
        tools: TOOL_DEFS,
    }));

    server.setRequestHandler(CallToolRequestSchema, async (request) => {
        const name = request.params.name;
        const args = (request.params.arguments ?? {}) as Record<string, unknown>;

        try {
            let result: unknown;
            switch (name) {
                case "list_pages":
                    result = listPages({ locale: args.locale as string | undefined });
                    break;
                case "read_page":
                    result = await readPage({
                        slug:   args.slug   as string,
                        locale: args.locale as string | undefined,
                    });
                    break;
                case "search_pages":
                    result = await searchPages({
                        query:  args.query  as string,
                        locale: args.locale as string | undefined,
                    });
                    break;
                case "get_function":
                    result = await getFunction({
                        library: args.library as string,
                        name:    args.name    as string,
                        locale:  args.locale  as string | undefined,
                    });
                    break;
                default:
                    throw new Error(`unknown tool: ${name}`);
            }

            const text = typeof result === "string"
                ? result
                : JSON.stringify(result, null, 2);

            return { content: [{ type: "text", text }] };
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            return {
                content: [{ type: "text", text: `ERROR: ${msg}` }],
                isError: true,
            };
        }
    });

    const transport = new StdioServerTransport();
    await server.connect(transport);
    process.stderr.write(`mcp-serotonin-docs v${VERSION} ready on stdio\n`);
}

main().catch((err) => {
    process.stderr.write(`fatal: ${err instanceof Error ? err.message : String(err)}\n`);
    process.exit(1);
});
