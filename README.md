# CA Agent — Core Tool Layer (Foundation Build)

Working, tested implementations of the infra-light tools from the manifest:
filesystem, document read (Excel/Word/CSV), document generate (Excel/Word),
the `run_python` calculator, and double-entry validation. All wrapped in the
audit-log envelope, `Decimal` for money, workspace-confined, no hard deletes.

GST, ledger/DB tools, standards lookup, and the whiteboard are deliberately
NOT here — they depend on your Postgres schema / frontend and come next.

## Layout
    tools/audit_log.py   append-only logging, actor context, @audited decorator
    tools/filesystem.py  create/read/write/list/move + soft-delete archive
    tools/doc_read.py    ingest_document router; read_excel/word/csv; pdf stub
    tools/doc_write.py   generate_excel/word; format_indian_number
    tools/calc.py        run_python sandbox; validate_double_entry
    tools/registry.py    TOOL_SCHEMAS (LiteLLM/OpenAI format) + dispatch()
    test_tools.py        end-to-end test of all 16 tools

## Wire to LiteLLM
    import litellm, json
    from tools.registry import TOOL_SCHEMAS, dispatch
    from tools.audit_log import set_actor
    set_actor("AI")
    resp = litellm.completion(model="groq/llama-3.3-70b-versatile",
                              messages=msgs, tools=TOOL_SCHEMAS)
    for call in resp.choices[0].message.tool_calls:
        out = dispatch(call.function.name, json.loads(call.function.arguments))
        msgs.append({"role":"tool","tool_call_id":call.id,"content":json.dumps(out, default=str)})
    # loop until message has no tool_calls

## Before production
- Set tools.filesystem.WORKSPACE_ROOT to your data root.
- Point tools.audit_log.log_event at your append-only Postgres table.
- Run tools.calc.run_python inside a container/isolate, not in-process.
