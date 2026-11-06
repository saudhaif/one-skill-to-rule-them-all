---
name: "ai-agent-anatomy"
version: "1.0.0"
description: "Designs, builds, explains and debugs AI agents using the six building blocks every agent needs: Model, Memory, Tool, API, Context and Data. Use whenever the user wants to plan, build, review or troubleshoot an AI agent, chatbot, assistant or automation, in n8n, Make, Zapier, LangChain, the Claude/OpenAI SDKs or plain code; when they mention an AI Agent node, chat model, OpenRouter, memory, tools, MCP client, output parser or system prompt; or when they ask what an agent is made of."
license: CC-BY-4.0
metadata:
  author: saudhaif
---

# AI Agent Anatomy — Model · Memory · Tool · API · Context · Data

Every working AI agent is built from the same six blocks. When planning,
building, reviewing or fixing an agent, walk through all six in this order
and make each one explicit. A missing or vague block is the usual cause of
an agent that "doesn't work".

| # | Block | Question it answers | n8n example |
|---|-------|--------------------|-------------|
| 1 | **Model** | Which brain thinks and decides? | OpenRouter Chat Model attached to the AI Agent node |
| 2 | **Memory** | What does it remember between turns? | Simple Memory (window buffer), Postgres/Redis chat memory |
| 3 | **Tool** | What actions can it take on its own? | Microsoft Excel 365, Airtable "Get a record", MCP Client |
| 4 | **API** | Which external services does the workflow call? | HTTP Request "Generate Poster Image" (POST) |
| 5 | **Context** | What does it know about its job right now? | System message, user's chat input, retrieved records |
| 6 | **Data** | What goes in and what must come out? | Spreadsheets/bases it reads, Structured Output Parser |

## 1. Model

- Pick for the task: a strong reasoning model for planning and tool use, a
  cheaper/faster one for classification or rewriting.
- A router (OpenRouter, a gateway) lets you swap models without rebuilding.
- Set temperature low (0–0.3) for tool calling and structured output.
- Record the exact model ID; "it worked yesterday" is often a model change.

## 2. Memory

- **Short-term (window buffer / Simple Memory):** last N messages, keyed by
  session ID. Make sure the session key is stable per user/conversation.
- **Long-term (database, vector store):** facts that must survive restarts.
- Keep the window small enough to fit the context budget (5–20 turns).
- Memory is not data: don't rely on chat history to hold business records.

## 3. Tool

- Each tool needs a clear name and description written *for the model*:
  what it does, when to use it, what inputs it needs.
- Give the agent the fewest tools that cover the job; more tools means more
  wrong choices.
- Prefer read-only tools until the flow is proven; gate writes/deletes.
- MCP Client lets one node expose a whole server's tools; check which ones
  are enabled and that credentials are valid (a red ⚠ on a node in n8n
  means missing credentials or config).

## 4. API

- Distinguish **tools** (the model chooses to call them) from **API steps**
  (the workflow always calls them, e.g. after the agent finishes).
- For each API: endpoint, method, auth, request body, expected response,
  timeout, rate limit.
- Always follow an API step with a check: an IF/Switch node
  ("Check Image Success") with a success branch and an error branch that
  builds a readable error message back to the user.
- Keep keys in credentials, never in prompts or node parameters.

## 5. Context

- **System prompt:** role, goal, rules, tone, language, what tools exist and
  when to use each, what to do when information is missing.
- **Runtime context:** the user's message, date/time, user profile, records
  fetched by tools.
- Put the output format in the prompt *and* enforce it with a parser.
- Context window is finite: summarise or trim long tool results.

## 6. Data

- **Input data:** where it lives (Excel, Airtable, Sheets, DB), who owns it,
  field names and types. The agent can only be as good as this data.
- **Output data:** define a schema (JSON) and enforce it with a Structured
  Output Parser so downstream nodes (e.g. an image-generation API) get
  exactly the fields they need.
- Validate before acting: required fields present, types correct.

## Reference flow (from the n8n "AI Advertising Poster Agent")

```
Chat Trigger
   → AI Agent
        ├─ Model:  OpenRouter Chat Model
        ├─ Memory: Simple Memory
        ├─ Tools:  Excel 365 (get workbooks) · Airtable (get record) · MCP Client
        └─ Output: Structured Output Parser  (e.g. {headline, body, image_prompt, style})
   → HTTP Request: Generate Poster Image (POST to image API)
   → IF: Check Image Success
        ├─ true  → return poster to user / save it
        └─ false → Build Error Message → reply to user
```

## How to use this skill

When the user asks to **build** an agent:
1. Ask (or infer) the goal and the trigger (chat, webhook, schedule, form).
2. Fill in all six blocks as a short spec, using the table above.
3. Produce the build: node-by-node steps for n8n/Make/Zapier, or code for an
   SDK. Include the system prompt and the output schema in full.
4. Add the success/error check after every external API call.
5. Give a test plan: one happy-path message, one missing-data case, one
   API-failure case.

When the user asks to **debug** an agent, check the blocks in this order and
stop at the first broken one: Data (is the source reachable and correct?) →
Tool (credentials, description) → Context (does the prompt say when to use
the tool?) → Model (capable enough, temperature) → Memory (session key,
window) → API (response shape, error branch).

When the user asks to **explain** an agent, describe it block by block in
plain language, with one sentence per block.

## Checklist

- [ ] Model chosen and ID recorded
- [ ] Memory type and session key defined
- [ ] Each tool has a model-facing description and working credentials
- [ ] Every external API call has a success/error branch
- [ ] System prompt states role, rules, tools and output format
- [ ] Input data sources listed; output schema enforced by a parser
- [ ] Tested: happy path, missing data, API failure
