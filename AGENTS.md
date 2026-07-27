<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Project UI rules

- Keep code minimal and avoid duplicate/custom UI when a shadcn/ui component can be used.
- Prefer shadcn/ui components for forms, cards, badges, avatars, separators, menus, and other interface pieces.
- For graphs and charts, use the shadcn chart component pattern instead of hand-built SVG/div charts.
- Put repeated UI patterns in common components and reuse those components instead of duplicating markup.
- Always place form field icons inside the input element border (e.g., using a relative container, absolute positioning for the icon, and input left padding class `pl-10`), never outside.
- Use the standard project DropdownMenu components (like `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuCheckboxItem` and `DropdownMenuRadioGroup`/`DropdownMenuRadioItem`) for all dropdowns, selectors, multi-selects, and status pickers to maintain look-and-feel consistency.
