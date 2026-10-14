# Workbench header native drag regression

Run from the repository root with the installed Electron binary:

```sh
node_modules/electron/dist/Electron.app/Contents/MacOS/Electron test/fixtures/workbench-header-drag/main.cjs
```

The fixture extracts the production header CSS from `client.js`, uses a temporary userData directory, and asserts computed drag regions for embedded/custom frames, non-embedded panels, Windows platform styling, controls, nested controls, popovers, and nested content headers. Set `DSH_DRAG_ASSERT_ONLY=1` to exit after those assertions. This fixture does not load or change any real Desktop profile.

For native verification on macOS, drag the dashed header whitespace and verify a `move` event with changed bounds in the printed `events.jsonl` path. Click Refresh (including its nested label), open Menu and click Menu item, and edit the input. These controls must respond without moving the window. Repeat at a narrow width and with the sidebar/caption area represented by the host layout. Computed CSS and synthetic DOM events alone do not prove native dragging.

The root-level semantic `header` is the supported host seam. Custom clickable containers must have a semantic role or `data-dsh-no-drag`; arbitrary click handlers cannot be inferred from CSS.
