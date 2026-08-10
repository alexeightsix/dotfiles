# Working order

Documentation is the source of truth for this editor's configuration, not the code.

The Docusaurus site at `~/kickstart/dotfiles/pi/docs` documents how this Pi instance is set up and how to use it. When a request touches that setup:

1. A request comes in.
2. Check the documentation. It is authoritative — if the code disagrees with it, the code is the thing that is wrong.
3. If the request changes behaviour, update the documentation first.
4. Then change the code to match.

Report a divergence between the docs and the code as a defect rather than silently following whichever one you read first.

## Verify before claiming it works

Changes to this configuration are not done when the file is written. Before reporting a change as working:

1. Run `./tests/e2e.sh` from the config directory. It checks that every extension loads, every symlink resolves, and the unit suite passes. Add `--paid` when the change touches a provider.
2. For anything that renders — statusline segments, widgets, overlays, dialogs — **look at it in tmux**. `tmux capture-pane -p -t <pane>` shows the live pi session. Padding, alignment, colour, and duplicated indicators are invisible in a headless run and obvious in a capture.

A headless smoke test proves an extension loads. It does not prove the thing looks right, and several defects here were only visible in a real pane.

## Logging documentation edits

Never edit a page under `docs/docs/` without adding an entry to `docs/docs/changelog.md`, and always state **why** the edit was made. What changed can be recovered from git; why it changed cannot. Group edits made for one reason under a single dated block: the reason first, then one bullet per page describing the behaviour now in force.
