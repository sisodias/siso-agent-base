# Pi Research Queue Workflow

This workflow turns the broad Pi ecosystem catalog into small batches that Codex Spark workers can process in parallel.

## Create A Batch

```bash
node research/scripts/create_research_queue.mjs \
  --offset 0 \
  --limit 25 \
  --output research/queues/research-batch-001.json
```

For the next batch:

```bash
node research/scripts/create_research_queue.mjs \
  --offset 25 \
  --limit 25 \
  --output research/queues/research-batch-002.json
```

## Worker Rule

Each worker takes one `items[]` entry, researches only that repo, writes strict JSON to `result_path`, then marks the queue item `done`.

The queue file includes the reusable worker prompt in:

```text
workflow.worker_prompt
```

## Synthesis Rule

After a batch is done, a synthesis agent reads:

```text
research/queues/research-batch-XXX.json
research/inbox/*.json
```

It then produces:

- `implement_now`
- `inspect_next`
- `reference_only`
- `risk_register`
- `integration_plan`

The queue file includes the reusable synthesis prompt in:

```text
workflow.synthesis_prompt
```

## Status Values

```text
todo
in_progress
done
blocked
skipped
```

## Tick Fields

```text
status
assigned_agent
result_path
result_confidence
notes
```
