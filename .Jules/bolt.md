## 2026-10-22 - High-throughput SSE stream parsing bottleneck
**Learning:** JSON.parse is extremely expensive when executed on every single chunk of a high-throughput SSE stream (like streaming LLM tokens). Most chunks do not contain the target payload (e.g. usage statistics).
**Action:** Always use a fast string heuristic (e.g. `payload.includes('"usage"')`) to pre-filter chunks before attempting to JSON.parse them in streaming hot paths.
