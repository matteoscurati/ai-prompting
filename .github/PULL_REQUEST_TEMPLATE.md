## Summary

<one or two sentences: what changes and why>

## Type

- [ ] Bug fix (non-breaking)
- [ ] New feature (non-breaking)
- [ ] Breaking change (API, rubric weights, default behavior)
- [ ] Documentation only
- [ ] Refactor / internal cleanup

## Checklist

- [ ] Tests pass locally (`npm test`).
- [ ] `npm run doctor` returns `Status: OK`.
- [ ] `CHANGELOG.md` updated under the appropriate version section.
- [ ] If a new task type / agent target / padding pattern was added, the corresponding `references/*.md` file is updated.
- [ ] If the rubric was changed, `references/prompt-quality-rubric.md` reflects the new weights.
- [ ] If a breaking change: justified in the PR body and noted in CHANGELOG.
- [ ] No new runtime dependencies added (devDeps require justification).
- [ ] Comments explain **why**, not **what** (well-named identifiers do the latter).

## Test plan

How a reviewer can verify this PR end-to-end. Be concrete:

```bash
# example
npm install && npm run build
node dist/src/cli.js improve --prompt "<your test input>" --mode diagnostic
# expected: <observable behavior>
```

## Related issues

Closes #
Refs #
