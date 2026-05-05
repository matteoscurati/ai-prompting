---
name: Feature request
about: Suggest a new task type, agent target, padding pattern, scoring category, or other enhancement
title: "[feature] "
labels: enhancement
---

## What problem does this solve?

Describe the prompt-engineering scenario or workflow this feature would unblock. Be concrete.

## Proposed solution

What you want to see in the package. If it's:

- **A new task type:** name it, list 5-10 keyword patterns that should classify into it, and describe the role + output_format defaults.
- **A new agent target:** name the host, link to its docs, describe any structural quirks the scaffold should handle.
- **A new padding pattern:** provide 3-5 real-world example sentences and a regex sketch.
- **A new scoring category:** explain what it measures, why the current 9 categories miss it, and propose a weight adjustment.
- **A new CLI flag or library option:** show the desired invocation and the expected effect.

## Alternatives considered

What other approaches did you think about, and why are they worse than your proposal?

## Backwards compatibility

Will this break existing prompts, scores, API consumers, or installed slash commands? If yes, is a major version bump warranted?

## Willing to contribute?

- [ ] I am willing to open a PR for this feature.
- [ ] I would benefit from a maintainer implementing it.
