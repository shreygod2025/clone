/**
 * Enhanced TipTap Image extension — adds `alt`, `title` and an optional
 * `data-link` attribute (image rendered inside an anchor tag so admins can
 * link images to external URLs for citation / product pages / SEO
 * canonicals).
 *
 * The base `@tiptap/extension-image` already supports `src` + `alt`, but
 * does NOT render a wrapping anchor. We extend it so getHTML() produces
 * `<a href="…"><img src alt title/></a>` when `linkHref` is set, falling
 * back to the plain `<img>` otherwise.
 */
import Image from '@tiptap/extension-image';
import { mergeAttributes } from '@tiptap/core';

export const SeoImage = Image.extend({
  name: 'image',

  addAttributes() {
    return {
      ...this.parent?.(),
      alt: {
        default: '',
        parseHTML: (el) => el.getAttribute('alt') || '',
        renderHTML: (attrs) => (attrs.alt ? { alt: attrs.alt } : {}),
      },
      title: {
        default: '',
        parseHTML: (el) => el.getAttribute('title') || '',
        renderHTML: (attrs) => (attrs.title ? { title: attrs.title } : {}),
      },
      linkHref: {
        default: '',
        parseHTML: (el) => el.getAttribute('data-link') || '',
        renderHTML: (attrs) => (attrs.linkHref ? { 'data-link': attrs.linkHref } : {}),
      },
    };
  },

  renderHTML({ HTMLAttributes }) {
    const { linkHref, ...rest } = HTMLAttributes;
    if (linkHref) {
      // Wrap the <img> in an <a> so the rendered blog page links the image
      // out — common SEO pattern for citing a source. `rel="noopener"`
      // + `target="_blank"` keep the user's current tab anchored.
      return [
        'a',
        {
          href: linkHref,
          target: '_blank',
          rel: 'noopener noreferrer',
          'data-link': linkHref,
        },
        ['img', mergeAttributes(rest, { 'data-link': linkHref })],
      ];
    }
    return ['img', mergeAttributes(rest)];
  },
});

export default SeoImage;
