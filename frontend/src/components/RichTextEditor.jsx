import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Youtube from '@tiptap/extension-youtube';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import { common, createLowlight } from 'lowlight';
import { useCallback, useEffect, useRef, useState } from 'react';
import { 
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, 
  Code, Heading1, Heading2, Heading3, 
  List, ListOrdered, Quote, Minus, 
  Link as LinkIcon, Image as ImageIcon, Youtube as YoutubeIcon,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Undo, Redo, Code2
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import axios from 'axios';

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
  const [imageUrl, setImageUrl] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
      }),
      Underline,
      Image.configure({
        HTMLAttributes: {
          class: 'rounded-lg max-w-full my-4',
        },
      }),
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
    if (!imageUrl) return;
    editor.chain().focus().setImage({ src: imageUrl }).run();
    setShowImageModal(false);
    setImageUrl('');
  }, [editor, imageUrl]);

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
      
      if (response.data.url) {
        editor.chain().focus().setImage({ src: response.data.url }).run();
      }
    } catch (error) {
      console.error('Image upload failed:', error);
      // Fallback to base64 if upload fails
      const reader = new FileReader();
      reader.onload = () => {
        editor.chain().focus().setImage({ src: reader.result }).run();
      };
      reader.readAsDataURL(file);
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
            title="Upload Image"
          >
            <ImageIcon className="w-4 h-4" />
          </MenuButton>
          <MenuButton
            onClick={() => setShowYoutubeModal(true)}
            title="Add YouTube Video"
          >
            <YoutubeIcon className="w-4 h-4" />
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

      {/* Image URL Modal */}
      <Dialog open={showImageModal} onOpenChange={setShowImageModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Image from URL</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Image URL</label>
              <Input
                placeholder="https://example.com/image.jpg"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addImage()}
              />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowImageModal(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={addImage} className="btn-primary flex-1">
                Add Image
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
    </div>
  );
};

export default RichTextEditor;
