/**
 * Custom TipTap Node — a "Callout" block.
 *
 * Renders as `<div class="callout callout-{variant}">…</div>` where variant
 * is one of info · success · warning · note. The frontend prose-styles map
 * each class to a coloured left-border + background so admins can insert
 * notes, tips, warnings etc. straight from the toolbar.
 *
 * We define this as a block-level Node that accepts arbitrary block content
 * (so admins can mix headings, bullets, images inside a callout). Variants
 * are stored as an `data-variant` attribute so a server-side sanitizer can
 * whitelist them and we round-trip cleanly through `editor.getHTML()`.
 */
import { Node, mergeAttributes } from '@tiptap/core';

export const Callout = Node.create({
  name: 'callout',
  group: 'block',
  content: 'block+',
  defining: true,

  addAttributes() {
    return {
      variant: {
        default: 'info',
        parseHTML: (el) => el.getAttribute('data-variant') || 'info',
        renderHTML: (attrs) => ({
          'data-variant': attrs.variant,
          class: `callout callout-${attrs.variant}`,
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div.callout' }, { tag: 'div[data-variant]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes), 0];
  },

  addCommands() {
    return {
      setCallout:
        (variant = 'info') =>
        ({ commands }) =>
          commands.wrapIn(this.name, { variant }),
      toggleCallout:
        (variant = 'info') =>
        ({ commands, editor }) => {
          if (editor.isActive(this.name)) return commands.lift(this.name);
          return commands.wrapIn(this.name, { variant });
        },
      unsetCallout:
        () =>
        ({ commands }) =>
          commands.lift(this.name),
    };
  },
});

export default Callout;
