import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Youtube from '@tiptap/extension-youtube';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import Highlight from '@tiptap/extension-highlight';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import SeoImage from './tiptap/SeoImage';
import Callout from './tiptap/Callout';
import { common, createLowlight } from 'lowlight';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  Code, Heading1, Heading2, Heading3,
  List, ListOrdered, Quote, Minus,
  Link as LinkIcon, Image as ImageIcon, Youtube as YoutubeIcon,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Undo, Redo, Code2, Highlighter, Info, AlertTriangle, Lightbulb, CheckCircle,
  Palette, Upload, MousePointerClick,
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import axios from 'axios';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const lowlight = createLowlight(common);

const MenuButton = ({ onClick, isActive, disabled, children, title }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    title={title}
    className={`p-2 rounded-lg transition-all ${
      isActive 
        ? 'bg-[#1E3A5F] text-white' 
        : 'text-slate-600 hover:bg-slate-100'
    } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
  >
    {children}
  </button>
);

const RichTextEditor = ({ content, onChange, placeholder = 'Start writing...', getAuthHeaders }) => {
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showYoutubeModal, setShowYoutubeModal] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  // Image modal state — alt is required for SEO & accessibility.
  const [imageForm, setImageForm] = useState({ src: '', alt: '', title: '', linkHref: '' });
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [showButtonModal, setShowButtonModal] = useState(false);
  const [buttonForm, setButtonForm] = useState({ label: '', url: '', variant: 'primary' });
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
      }),
      Underline,
      Highlight.configure({ multicolor: true }),
      TextStyle,
      Color,
      SeoImage.configure({
        HTMLAttributes: {
          class: 'rounded-lg max-w-full my-4',
        },
      }),
      Callout,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-[#D63031] underline hover:no-underline',
        },
      }),
      Youtube.configure({
        width: 640,
        height: 360,
        HTMLAttributes: {
          class: 'rounded-lg my-4',
        },
      }),
      CodeBlockLowlight.configure({
        lowlight,
        HTMLAttributes: {
          class: 'bg-slate-900 text-slate-100 rounded-lg p-4 my-4 overflow-x-auto',
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
    ],
    content: content || '',
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content || '');
    }
  }, [content, editor]);

  const addLink = useCallback(() => {
    if (!linkUrl) return;
    
    const url = linkUrl.startsWith('http') ? linkUrl : `https://${linkUrl}`;
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    setShowLinkModal(false);
    setLinkUrl('');
  }, [editor, linkUrl]);

  const addImage = useCallback(() => {
    if (!imageForm.src) return;
    editor
      .chain()
      .focus()
      .setImage({
        src: imageForm.src,
        alt: imageForm.alt || '',
        title: imageForm.title || '',
        linkHref: imageForm.linkHref || '',
      })
      .run();
    setShowImageModal(false);
    setImageForm({ src: '', alt: '', title: '', linkHref: '' });
  }, [editor, imageForm]);

  const addButton = useCallback(() => {
    if (!buttonForm.label || !buttonForm.url || !editor) return;
    // Insert a styled anchor as raw HTML. The sanitizer on BlogDetailPage
    // whitelists the `blog-cta` + `blog-cta-{variant}` class names so the
    // button survives DOMPurify and renders via the published prose CSS.
    const safeLabel = buttonForm.label.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const safeUrl = buttonForm.url.replace(/"/g, '&quot;');
    const variant = buttonForm.variant === 'secondary' ? 'secondary' : 'primary';
    const html = `<p><a href="${safeUrl}" class="blog-cta blog-cta-${variant}" target="_blank" rel="noopener">${safeLabel}</a></p>`;
    editor.chain().focus().insertContent(html).run();
    setShowButtonModal(false);
    setButtonForm({ label: '', url: '', variant: 'primary' });
  }, [editor, buttonForm]);

  const addYoutube = useCallback(() => {
    if (!youtubeUrl) return;
    editor.chain().focus().setYoutubeVideo({ src: youtubeUrl }).run();
    setShowYoutubeModal(false);
    setYoutubeUrl('');
  }, [editor, youtubeUrl]);

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post(`${API}/upload/image`, formData, {
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'multipart/form-data',
        },
      });

      // Instead of silently inserting the image, open the Image modal
      // pre-filled with the uploaded URL so the admin can set alt +
      // caption + optional link before it lands in the body. The alt
      // text is critical for both SEO and screen-reader accessibility.
      if (response.data.url) {
        setImageForm({
          src: response.data.url,
          alt: file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').slice(0, 120),
          title: '',
          linkHref: '',
        });
        setShowImageModal(true);
      }
    } catch (error) {
      console.error('Image upload failed:', error);
      // SAFE FALLBACK — only inline small images as base64 (<500 KB) so
      // phone photos don't bloat the blog HTML past Mongo's 16 MB doc
      // limit and silently break the save.
      if (file.size <= 500 * 1024) {
        const reader = new FileReader();
        reader.onload = () => {
          setImageForm({
            src: reader.result,
            alt: file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').slice(0, 120),
            title: '',
            linkHref: '',
          });
          setShowImageModal(true);
        };
        reader.readAsDataURL(file);
      } else {
        toast.error('Image upload failed. Please try again or paste an image URL manually.');
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  if (!editor) return null;

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
      {/* Toolbar */}
      <div className="border-b border-slate-200 p-2 bg-slate-50 flex flex-wrap gap-1">
        {/* Text Formatting */}
        <div className="flex gap-0.5 border-r border-slate-200 pr-2 mr-1">
          <MenuButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            isActive={editor.isActive('bold')}
            title="Bold"
          >
            <Bold className="w-4 h-4" />
          </MenuButton>
          <MenuButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            isActive={editor.isActive('italic')}
            title="Italic"
          >
            <Italic className="w-4 h-4" />
          </MenuButton>
          <MenuButton
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            isActive={editor.isActive('underline')}
            title="Underline"
          >
            <UnderlineIcon className="w-4 h-4" />
          </MenuButton>
          <MenuButton
            onClick={() => editor.chain().focus().toggleStrike().run()}
            isActive={editor.isActive('strike')}
            title="Strikethrough"
          >
            <Strikethrough className="w-4 h-4" />
          </MenuButton>
          <MenuButton
            onClick={() => editor.chain().focus().toggleCode().run()}
            isActive={editor.isActive('code')}
            title="Inline Code"
          >
            <Code className="w-4 h-4" />
          </MenuButton>
        </div>

        {/* Headings */}
        <div className="flex gap-0.5 border-r border-slate-200 pr-2 mr-1">
          <MenuButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            isActive={editor.isActive('heading', { level: 1 })}
            title="Heading 1"
          >
            <Heading1 className="w-4 h-4" />
          </MenuButton>
          <MenuButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            isActive={editor.isActive('heading', { level: 2 })}
            title="Heading 2"
          >
            <Heading2 className="w-4 h-4" />
          </MenuButton>
          <MenuButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            isActive={editor.isActive('heading', { level: 3 })}
            title="Heading 3"
          >
            <Heading3 className="w-4 h-4" />
          </MenuButton>
        </div>

        {/* Lists & Blocks */}
        <div className="flex gap-0.5 border-r border-slate-200 pr-2 mr-1">
          <MenuButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            isActive={editor.isActive('bulletList')}
            title="Bullet List"
          >
            <List className="w-4 h-4" />
          </MenuButton>
          <MenuButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            isActive={editor.isActive('orderedList')}
            title="Numbered List"
          >
            <ListOrdered className="w-4 h-4" />
          </MenuButton>
          <MenuButton
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            isActive={editor.isActive('blockquote')}
            title="Quote"
          >
            <Quote className="w-4 h-4" />
          </MenuButton>
          <MenuButton
            onClick={() => editor.chain().focus().toggleHighlight({ color: '#FEF3C7' }).run()}
            isActive={editor.isActive('highlight')}
            title="Highlight text (coloured background)"
          >
            <Highlighter className="w-4 h-4" />
          </MenuButton>
          {/* Text colour picker. The native <input type=color> is wrapped
              around a Palette icon so the whole chip is clickable and
              applies the colour instantly on change. */}
          <label
            title="Text colour"
            className="relative inline-flex items-center justify-center w-9 h-9 rounded hover:bg-slate-100 cursor-pointer"
          >
            <Palette className="w-4 h-4" style={{ color: editor.getAttributes('textStyle').color || '#0A1F44' }} />
            <input
              type="color"
              className="absolute inset-0 opacity-0 cursor-pointer"
              value={editor.getAttributes('textStyle').color || '#000000'}
              onInput={(e) => editor.chain().focus().setColor(e.target.value).run()}
              data-testid="rte-text-color"
            />
          </label>
          <MenuButton
            onClick={() => editor.chain().focus().unsetColor().run()}
            title="Reset text colour"
          >
            <Palette className="w-4 h-4 text-slate-400 line-through" />
          </MenuButton>
          <MenuButton
            onClick={() => editor.chain().focus().toggleCallout('info').run()}
            isActive={editor.isActive('callout', { variant: 'info' })}
            title="Insert Info callout (blue)"
          >
            <Info className="w-4 h-4" />
          </MenuButton>
          <MenuButton
            onClick={() => editor.chain().focus().toggleCallout('success').run()}
            isActive={editor.isActive('callout', { variant: 'success' })}
            title="Insert Success callout (green)"
          >
            <CheckCircle className="w-4 h-4" />
          </MenuButton>
          <MenuButton
            onClick={() => editor.chain().focus().toggleCallout('warning').run()}
            isActive={editor.isActive('callout', { variant: 'warning' })}
            title="Insert Warning callout (amber)"
          >
            <AlertTriangle className="w-4 h-4" />
          </MenuButton>
          <MenuButton
            onClick={() => editor.chain().focus().toggleCallout('note').run()}
            isActive={editor.isActive('callout', { variant: 'note' })}
            title="Insert Note callout (purple)"
          >
            <Lightbulb className="w-4 h-4" />
          </MenuButton>
          <MenuButton
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            isActive={editor.isActive('codeBlock')}
            title="Code Block"
          >
            <Code2 className="w-4 h-4" />
          </MenuButton>
          <MenuButton
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            title="Divider"
          >
            <Minus className="w-4 h-4" />
          </MenuButton>
        </div>

        {/* Alignment */}
        <div className="flex gap-0.5 border-r border-slate-200 pr-2 mr-1">
          <MenuButton
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            isActive={editor.isActive({ textAlign: 'left' })}
            title="Align Left"
          >
            <AlignLeft className="w-4 h-4" />
          </MenuButton>
          <MenuButton
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            isActive={editor.isActive({ textAlign: 'center' })}
            title="Align Center"
          >
            <AlignCenter className="w-4 h-4" />
          </MenuButton>
          <MenuButton
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
            isActive={editor.isActive({ textAlign: 'right' })}
            title="Align Right"
          >
            <AlignRight className="w-4 h-4" />
          </MenuButton>
          <MenuButton
            onClick={() => editor.chain().focus().setTextAlign('justify').run()}
            isActive={editor.isActive({ textAlign: 'justify' })}
            title="Justify"
          >
            <AlignJustify className="w-4 h-4" />
          </MenuButton>
        </div>

        {/* Media */}
        <div className="flex gap-0.5 border-r border-slate-200 pr-2 mr-1">
          <MenuButton
            onClick={() => setShowLinkModal(true)}
            isActive={editor.isActive('link')}
            title="Add Link"
          >
            <LinkIcon className="w-4 h-4" />
          </MenuButton>
          <MenuButton
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            title="Upload image from your computer (then set alt + caption)"
          >
            {uploading ? (
              <Upload className="w-4 h-4 animate-pulse" />
            ) : (
              <ImageIcon className="w-4 h-4" />
            )}
          </MenuButton>
          <MenuButton
            onClick={() => setShowImageModal(true)}
            title="Insert image from URL instead"
          >
            <LinkIcon className="w-4 h-4 opacity-60" />
          </MenuButton>
          <MenuButton
            onClick={() => setShowYoutubeModal(true)}
            title="Add YouTube Video"
          >
            <YoutubeIcon className="w-4 h-4" />
          </MenuButton>
          <MenuButton
            onClick={() => setShowButtonModal(true)}
            title="Insert CTA button (label + link)"
          >
            <MousePointerClick className="w-4 h-4" />
          </MenuButton>
        </div>

        {/* Undo/Redo */}
        <div className="flex gap-0.5">
          <MenuButton
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            title="Undo"
          >
            <Undo className="w-4 h-4" />
          </MenuButton>
          <MenuButton
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            title="Redo"
          >
            <Redo className="w-4 h-4" />
          </MenuButton>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImageUpload}
        accept="image/*"
        className="hidden"
      />

      {/* Editor Content */}
      <EditorContent
        editor={editor}
        className="prose prose-slate max-w-none p-4 min-h-[400px] focus:outline-none
          [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[350px]
          [&_.ProseMirror_p.is-editor-empty:first-child]:before:content-[attr(data-placeholder)]
          [&_.ProseMirror_p.is-editor-empty:first-child]:before:text-slate-400
          [&_.ProseMirror_p.is-editor-empty:first-child]:before:float-left
          [&_.ProseMirror_p.is-editor-empty:first-child]:before:pointer-events-none
          [&_.ProseMirror_p.is-editor-empty:first-child]:before:h-0
          [&_.ProseMirror_h1]:text-3xl [&_.ProseMirror_h1]:font-bold [&_.ProseMirror_h1]:text-[#1E3A5F] [&_.ProseMirror_h1]:mb-4
          [&_.ProseMirror_h2]:text-2xl [&_.ProseMirror_h2]:font-bold [&_.ProseMirror_h2]:text-[#1E3A5F] [&_.ProseMirror_h2]:mb-3
          [&_.ProseMirror_h3]:text-xl [&_.ProseMirror_h3]:font-semibold [&_.ProseMirror_h3]:text-[#1E3A5F] [&_.ProseMirror_h3]:mb-2
          [&_.ProseMirror_blockquote]:border-l-4 [&_.ProseMirror_blockquote]:border-[#D63031] [&_.ProseMirror_blockquote]:pl-4 [&_.ProseMirror_blockquote]:italic [&_.ProseMirror_blockquote]:text-slate-600
          [&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:pl-6
          [&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:pl-6
          [&_.ProseMirror_pre]:bg-slate-900 [&_.ProseMirror_pre]:text-slate-100 [&_.ProseMirror_pre]:rounded-lg [&_.ProseMirror_pre]:p-4
          [&_.ProseMirror_code]:bg-slate-100 [&_.ProseMirror_code]:text-[#D63031] [&_.ProseMirror_code]:px-1.5 [&_.ProseMirror_code]:py-0.5 [&_.ProseMirror_code]:rounded [&_.ProseMirror_code]:text-sm
          [&_.ProseMirror_hr]:border-slate-200 [&_.ProseMirror_hr]:my-6
          [&_.ProseMirror_img]:rounded-lg [&_.ProseMirror_img]:max-w-full
          [&_.ProseMirror_.callout]:rounded-xl [&_.ProseMirror_.callout]:px-4 [&_.ProseMirror_.callout]:py-3 [&_.ProseMirror_.callout]:my-4 [&_.ProseMirror_.callout]:border-l-4
          [&_.ProseMirror_.callout-info]:bg-blue-50 [&_.ProseMirror_.callout-info]:border-blue-400 [&_.ProseMirror_.callout-info]:text-blue-900
          [&_.ProseMirror_.callout-success]:bg-emerald-50 [&_.ProseMirror_.callout-success]:border-emerald-400 [&_.ProseMirror_.callout-success]:text-emerald-900
          [&_.ProseMirror_.callout-warning]:bg-amber-50 [&_.ProseMirror_.callout-warning]:border-amber-400 [&_.ProseMirror_.callout-warning]:text-amber-900
          [&_.ProseMirror_.callout-note]:bg-purple-50 [&_.ProseMirror_.callout-note]:border-purple-400 [&_.ProseMirror_.callout-note]:text-purple-900
          [&_.ProseMirror_mark]:bg-yellow-100 [&_.ProseMirror_mark]:rounded [&_.ProseMirror_mark]:px-1
        "
      />

      {/* Link Modal */}
      <Dialog open={showLinkModal} onOpenChange={setShowLinkModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Link</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">URL</label>
              <Input
                placeholder="https://example.com"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addLink()}
              />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowLinkModal(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={addLink} className="btn-primary flex-1">
                Add Link
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Image URL Modal — collects ALT (required for SEO + a11y) + an
          optional caption/title and an optional link URL so the image
          renders as `<a href=…><img alt title></a>` on the public page. */}
      <Dialog open={showImageModal} onOpenChange={setShowImageModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Insert Image</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Image URL *</label>
              <Input
                placeholder="https://example.com/image.jpg"
                value={imageForm.src}
                onChange={(e) => setImageForm((f) => ({ ...f, src: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Alt text <span className="text-red-500">*</span>
                <span className="text-xs font-normal text-slate-400 ml-1">(for SEO & screen-readers)</span>
              </label>
              <Input
                placeholder="A student soldering a robot chassis"
                value={imageForm.alt}
                onChange={(e) => setImageForm((f) => ({ ...f, alt: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Caption / title <span className="text-xs font-normal text-slate-400">(hover tooltip)</span>
              </label>
              <Input
                placeholder="Round 1 build day — RoboRacer kit"
                value={imageForm.title}
                onChange={(e) => setImageForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Link URL <span className="text-xs font-normal text-slate-400">(wraps the image in &lt;a&gt;)</span>
              </label>
              <Input
                placeholder="https://oll.co/shop/product/… (optional)"
                value={imageForm.linkHref}
                onChange={(e) => setImageForm((f) => ({ ...f, linkHref: e.target.value }))}
              />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowImageModal(false)} className="flex-1">
                Cancel
              </Button>
              <Button
                onClick={addImage}
                disabled={!imageForm.src || !imageForm.alt}
                className="btn-primary flex-1"
              >
                Insert Image
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* YouTube Modal */}
      <Dialog open={showYoutubeModal} onOpenChange={setShowYoutubeModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add YouTube Video</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">YouTube URL</label>
              <Input
                placeholder="https://www.youtube.com/watch?v=..."
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addYoutube()}
              />
              <p className="text-xs text-slate-500 mt-1">Paste a YouTube video URL</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowYoutubeModal(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={addYoutube} className="btn-primary flex-1">
                Add Video
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Button / CTA Modal — inserts a styled <a class="blog-cta"> so
          admins can drop call-to-action buttons anywhere in the body
          without writing HTML. The sanitizer on BlogDetailPage keeps
          the class names so the published renderer picks them up. */}
      <Dialog open={showButtonModal} onOpenChange={setShowButtonModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Insert CTA Button</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Button label *</label>
              <Input
                placeholder="e.g. Book a Free Demo"
                value={buttonForm.label}
                onChange={(e) => setButtonForm({ ...buttonForm, label: e.target.value })}
                data-testid="rte-button-label"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Link URL *</label>
              <Input
                placeholder="https://… or /student"
                value={buttonForm.url}
                onChange={(e) => setButtonForm({ ...buttonForm, url: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && addButton()}
                data-testid="rte-button-url"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Style</label>
              <div className="flex gap-2">
                {[
                  { v: 'primary', label: 'Red / Primary', bg: '#D63031', fg: '#fff' },
                  { v: 'secondary', label: 'Dark / Secondary', bg: '#0A1F44', fg: '#fff' },
                ].map((opt) => (
                  <button
                    key={opt.v}
                    type="button"
                    onClick={() => setButtonForm({ ...buttonForm, variant: opt.v })}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold border-2 transition ${buttonForm.variant === opt.v ? 'border-[#D63031]' : 'border-slate-200'}`}
                    style={{ background: opt.bg, color: opt.fg }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowButtonModal(false)} className="flex-1">
                Cancel
              </Button>
              <Button
                onClick={addButton}
                disabled={!buttonForm.label || !buttonForm.url}
                className="btn-primary flex-1"
                data-testid="rte-button-insert"
              >
                Insert Button
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RichTextEditor;
