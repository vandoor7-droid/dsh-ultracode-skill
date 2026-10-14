// Eval 3 fixture: a Claude-Code-style workflow script with deliberate flaws for the review task.
// (Reference material written for the eval; not meant to run on dsh.)
export const meta = {
  name: 'error-audit',
  description: 'Audit error handling across the repo',
  phases: [
    { title: 'Scan' },
    { title: 'Verify' },
  ],
}

const MAX_ROUNDS = 5
const results = []
const start = Date.now()

phase('Scan')
const files = await agent('List all source files in the repo.', { effort: 'low' })
const all = await parallel(
  files.list.map((f) => () =>
    agent(`Inspect ${f} for swallowed exceptions.`, {
      label: `scan:${f}`,
      phase: 'Scan',
      isolation: 'worktree',
      agentType: 'reviewer',
      model: 'claude-sonnet-4-5',
    }),
  ),
)

phase('Verify')
const verified = await parallel(
  all.filter(Boolean).map((r) => () =>
    agent(`Verify finding: ${JSON.stringify(r)}`, { effort: 'high', schema: { type: 'object' } }),
  ),
)

while (budget.remaining() > 50_000 && results.length < MAX_ROUNDS) {
  const round = await agent('Find more issues.', { label: 'hunt' })
  results.push(round)
}

return { findings: verified, elapsed: Date.now() - start, spent: budget.spent() }
