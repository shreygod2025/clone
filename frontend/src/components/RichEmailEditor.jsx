import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { Color } from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import { useState, useEffect, useRef } from 'react';
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, List, ListOrdered,
  Link as LinkIcon, Image as ImageIcon, Code, Type, Palette,
  AlignLeft, AlignCenter, AlignRight, Heading1, Heading2, Quote,
  Undo, Redo, Video, MousePointer2,
} from 'lucide-react';

const PALETTE = ['#0F172A', '#1E3A5F', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#a855f7', '#ec4899', '#64748b'];

const VARIABLES = [
  { token: '{{first_name}}', label: 'First name' },
  { token: '{{last_name}}',  label: 'Last name' },
  { token: '{{school}}',     label: 'School' },
  { token: '{{course}}',     label: 'Course' },
  { token: '{{city}}',       label: 'City' },
];

const Btn = ({ active, onClick, title, children, 'data-testid': testId }) => (
  <button type="button" onClick={onClick} title={title} data-testid={testId}
    className={`p-1.5 rounded hover:bg-slate-200 ${active ? 'bg-slate-200 text-indigo-700' : 'text-slate-600'}`}>
    {children}
  </button>
);

export default function RichEmailEditor({ value, onChange }) {
  const [showHtml, setShowHtml] = useState(false);
  const [htmlText, setHtmlText] = useState(value || '');
  const fileRef = useRef(null);
  const lastEmittedRef = useRef(value || '');

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ underline: false }),
      Underline,
      Link.configure({ openOnClick: false, HTMLAttributes: { class: 'underline text-indigo-700' } }),
      Image.configure({ HTMLAttributes: { class: 'max-w-full h-auto rounded' } }),
      TextStyle,
      Color,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder: 'Write your email…' }),
    ],
    content: value || '',
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      lastEmittedRef.current = html;
      onChange?.(html);
      setHtmlText(html);
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none min-h-[280px] p-4 focus:outline-none',
        'data-testid': 'rich-editor-content',
      },
    },
  });

  // Sync external value changes (e.g. switching templates) into the editor
  useEffect(() => {
    if (!editor) return;
    if (value !== undefined && value !== lastEmittedRef.current && value !== editor.getHTML()) {
      editor.commands.setContent(value || '', { emitUpdate: false });
      setHtmlText(value || '');
    }
  }, [value, editor]);

  if (!editor) return null;

  const setLink = () => {
    const prev = editor.getAttributes('link').href;
    const url = window.prompt('URL', prev || 'https://');
    if (url === null) return;
    if (url === '') { editor.chain().focus().unsetLink().run(); return; }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url, target: '_blank' }).run();
  };

  const setImage = () => {
    const url = window.prompt('Image URL');
    if (url) editor.chain().focus().setImage({ src: url }).run();
  };

  const setYoutube = () => {
    const url = window.prompt('YouTube URL');
    if (!url) return;
    // Convert to thumbnail-with-link block since plain HTML emails don't support iframes
    const m = url.match(/(?:v=|youtu\.be\/)([\w-]{11})/);
    if (!m) return;
    const id = m[1];
    const block = `<a href="${url}" target="_blank" style="display:inline-block"><img src="https://img.youtube.com/vi/${id}/maxresdefault.jpg" alt="Watch video" style="max-width:100%;height:auto;border-radius:8px"/></a>`;
    editor.chain().focus().insertContent(block).run();
  };

  const insertButton = () => {
    const label = window.prompt('Button label', 'Get started');
    if (!label) return;
    const href = window.prompt('Button URL', 'https://oll.co/');
    if (!href) return;
    const html = `<p style="text-align:center"><a href="${href}" target="_blank" style="display:inline-block;background:#1E3A5F;color:#fff;padding:12px 22px;border-radius:999px;text-decoration:none;font-weight:600;font-size:14px">${label}</a></p><p></p>`;
    editor.chain().focus().insertContent(html).run();
  };

  const onPickImage = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1024 * 1024 * 2) {
      alert('Image too large (max 2 MB). Use an image URL or upload smaller.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => editor.chain().focus().setImage({ src: reader.result }).run();
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const insertVariable = (token) => editor.chain().focus().insertContent(token).run();

  return (
    <div className="border border-slate-300 rounded-lg overflow-hidden bg-white" data-testid="rich-editor">
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-slate-200 bg-slate-50">
        <Btn onClick={() => editor.chain().focus().undo().run()} title="Undo"><Undo className="w-4 h-4" /></Btn>
        <Btn onClick={() => editor.chain().focus().redo().run()} title="Redo"><Redo className="w-4 h-4" /></Btn>
        <span className="w-px h-5 bg-slate-300 mx-1" />
        <Btn active={editor.isActive('heading', { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} title="Heading 1"><Heading1 className="w-4 h-4" /></Btn>
        <Btn active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="Heading 2"><Heading2 className="w-4 h-4" /></Btn>
        <span className="w-px h-5 bg-slate-300 mx-1" />
        <Btn active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} title="Bold" data-testid="editor-bold"><Bold className="w-4 h-4" /></Btn>
        <Btn active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic"><Italic className="w-4 h-4" /></Btn>
        <Btn active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Underline"><UnderlineIcon className="w-4 h-4" /></Btn>
        <Btn active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()} title="Strikethrough"><Strikethrough className="w-4 h-4" /></Btn>
        <span className="w-px h-5 bg-slate-300 mx-1" />
        <Btn active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Bullet list"><List className="w-4 h-4" /></Btn>
        <Btn active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Numbered list"><ListOrdered className="w-4 h-4" /></Btn>
        <Btn active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()} title="Quote"><Quote className="w-4 h-4" /></Btn>
        <span className="w-px h-5 bg-slate-300 mx-1" />
        <Btn onClick={() => editor.chain().focus().setTextAlign('left').run()} title="Align left"><AlignLeft className="w-4 h-4" /></Btn>
        <Btn onClick={() => editor.chain().focus().setTextAlign('center').run()} title="Align center"><AlignCenter className="w-4 h-4" /></Btn>
        <Btn onClick={() => editor.chain().focus().setTextAlign('right').run()} title="Align right"><AlignRight className="w-4 h-4" /></Btn>
        <span className="w-px h-5 bg-slate-300 mx-1" />
        <div className="relative group">
          <Btn title="Text color"><Palette className="w-4 h-4" /></Btn>
          <div className="absolute top-full left-0 z-10 hidden group-hover:flex flex-wrap gap-1 p-2 bg-white border border-slate-200 rounded shadow-lg w-40">
            {PALETTE.map(c => (
              <button type="button" key={c} onClick={() => editor.chain().focus().setColor(c).run()}
                style={{ background: c }} className="w-5 h-5 rounded-full border border-white shadow" />
            ))}
            <button type="button" onClick={() => editor.chain().focus().unsetColor().run()} className="text-[10px] text-slate-500 underline w-full">reset</button>
          </div>
        </div>
        <Btn onClick={setLink} active={editor.isActive('link')} title="Insert link"><LinkIcon className="w-4 h-4" /></Btn>
        <Btn onClick={() => fileRef.current?.click()} title="Insert image (upload)"><ImageIcon className="w-4 h-4" /></Btn>
        <input ref={fileRef} type="file" accept="image/*" onChange={onPickImage} className="hidden" />
        <Btn onClick={setImage} title="Insert image (URL)"><Type className="w-4 h-4" /></Btn>
        <Btn onClick={setYoutube} title="Embed YouTube"><Video className="w-4 h-4" /></Btn>
        <Btn onClick={insertButton} title="Insert button"><MousePointer2 className="w-4 h-4" /></Btn>
        <span className="w-px h-5 bg-slate-300 mx-1" />
        <div className="relative group">
          <Btn title="Insert variable">{'{{·}}'}</Btn>
          <div className="absolute top-full right-0 z-10 hidden group-hover:block bg-white border border-slate-200 rounded shadow-lg min-w-[160px]">
            {VARIABLES.map(v => (
              <button type="button" key={v.token} onClick={() => insertVariable(v.token)} className="block w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50">
                <code className="text-indigo-700">{v.token}</code> <span className="text-slate-500 ml-1">{v.label}</span>
              </button>
            ))}
          </div>
        </div>
        <Btn onClick={() => setShowHtml(s => !s)} active={showHtml} title="Edit raw HTML" data-testid="editor-html-toggle"><Code className="w-4 h-4" /></Btn>
      </div>

      {showHtml ? (
        <textarea
          value={htmlText}
          onChange={(e) => { setHtmlText(e.target.value); }}
          onBlur={() => {
            editor.commands.setContent(htmlText, { emitUpdate: true });
            onChange?.(htmlText);
          }}
          rows={14}
          className="w-full p-3 font-mono text-xs focus:outline-none"
          data-testid="editor-html-textarea"
        />
      ) : (
        <EditorContent editor={editor} />
      )}
    </div>
  );
}
