import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useEditor, EditorContent, Extension } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import { TableKit } from '@tiptap/extension-table';
import Highlight from '@tiptap/extension-highlight';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import { TextStyleKit } from '@tiptap/extension-text-style';
import Placeholder from '@tiptap/extension-placeholder';
import Image from '@tiptap/extension-image';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  List, ListOrdered, Link2, Undo, Redo,
  Eraser, AlignLeft, AlignCenter, AlignRight,
  Type, Palette, Highlighter, Subscript as SubIcon, Superscript as SupIcon,
  Code, CodeXml, Quote, Minus, X, BarChart3,
  Indent, Outdent, ChevronDown, ListChecks
} from 'lucide-react';
import { markdownToHtml, htmlToMarkdown, prepareTermsMarkdown } from '../../utils/markdownHtmlConverter';

const INDENT_SIZE = 24; // px per level
const MAX_INDENT = 8;

/** Indent paragraphs/headings; falls back to list nest when inside a list */
const IndentExt = Extension.create({
  name: 'indent',
  addOptions() {
    return { types: ['paragraph', 'heading'], min: 0, max: MAX_INDENT };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          indent: {
            default: 0,
            parseHTML: (element) => {
              const raw = element.getAttribute('data-indent');
              if (raw != null) return Math.min(MAX_INDENT, parseInt(raw, 10) || 0);
              const ml = parseInt(element.style.marginLeft || '0', 10);
              return Math.min(MAX_INDENT, Math.round(ml / INDENT_SIZE) || 0);
            },
            renderHTML: (attributes) => {
              if (!attributes.indent) return {};
              return {
                'data-indent': attributes.indent,
                style: `margin-left: ${attributes.indent * INDENT_SIZE}px`,
              };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    const clamp = (n) => Math.max(this.options.min, Math.min(this.options.max, n));
    const activeType = (editor) =>
      this.options.types.find((type) => editor.isActive(type)) || this.options.types[0];
    return {
      indent: () => ({ editor, commands }) => {
        if (editor.can().sinkListItem('listItem')) {
          return commands.sinkListItem('listItem');
        }
        if (editor.can().sinkListItem('taskItem')) {
          return commands.sinkListItem('taskItem');
        }
        const type = activeType(editor);
        const node = editor.getAttributes(type);
        return commands.updateAttributes(type, { indent: clamp((node.indent || 0) + 1) });
      },
      outdent: () => ({ editor, commands }) => {
        if (editor.can().liftListItem('listItem')) {
          return commands.liftListItem('listItem');
        }
        if (editor.can().liftListItem('taskItem')) {
          return commands.liftListItem('taskItem');
        }
        const type = activeType(editor);
        const node = editor.getAttributes(type);
        return commands.updateAttributes(type, { indent: clamp((node.indent || 0) - 1) });
      },
    };
  },
  addKeyboardShortcuts() {
    return {
      Tab: () => this.editor.commands.indent(),
      'Shift-Tab': () => this.editor.commands.outdent(),
    };
  },
});

const FONT_FAMILIES = [
  { name: 'Default Font', value: null },
  { name: 'Inter', value: 'Inter, sans-serif' },
  { name: 'Roboto', value: 'Roboto, sans-serif' },
  { name: 'Arial', value: 'Arial, sans-serif' },
  { name: 'Georgia', value: 'Georgia, serif' },
  { name: 'Times New Roman', value: '"Times New Roman", serif' },
  { name: 'Courier New', value: '"Courier New", monospace' },
  { name: 'Impact', value: 'Impact, Charcoal, sans-serif' },
  { name: 'Trebuchet MS', value: '"Trebuchet MS", sans-serif' },
  { name: 'Verdana', value: 'Verdana, Geneva, sans-serif' },
];

const FONT_SIZES = [
  { name: 'Default Size', value: null },
  { name: '12px', value: '12px' },
  { name: '14px', value: '14px' },
  { name: '16px', value: '16px' },
  { name: '18px', value: '18px' },
  { name: '20px', value: '20px' },
  { name: '24px', value: '24px' },
  { name: '30px', value: '30px' },
  { name: '36px', value: '36px' },
  { name: '48px', value: '48px' },
];

const TEXT_COLORS = [
  { name: 'Default', value: null },
  { name: 'Indigo', value: '#4f46e5' },
  { name: 'Purple', value: '#9333ea' },
  { name: 'Emerald', value: '#059669' },
  { name: 'Rose', value: '#e11d48' },
  { name: 'Amber', value: '#d97706' },
  { name: 'Steel', value: '#475569' },
  { name: 'Black', value: '#0f172a' },
];

const HIGHLIGHT_COLORS = [
  { name: 'Clear', value: null },
  { name: 'Yellow', value: '#fef08a' },
  { name: 'Green', value: '#bbf7d0' },
  { name: 'Blue', value: '#bfdbfe' },
  { name: 'Rose', value: '#fecdd3' },
  { name: 'Orange', value: '#fed7aa' },
  { name: 'Purple', value: '#e9d5ff' },
];

export default function RichTextEditor({ value, onChange, placeholder = 'Start typing...' }) {
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [stats, setStats] = useState({ words: 0, characters: 0, readTime: 0 });
  const lastMarkdownRef = useRef('');
  const isExternalRef = useRef(false);

  const calculateStats = useCallback((html) => {
    const cleanText = (html || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    const cleanChars = (html || '').replace(/<[^>]*>/g, '');
    const words = cleanText ? cleanText.split(' ').length : 0;
    const characters = cleanChars.length;
    const readTime = Math.max(1, Math.ceil(words / 200)) || 0;
    setStats({ words, characters, readTime: words ? readTime : 0 });
  }, []);

  const editor = useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4, 5, 6] },
        link: {
          openOnClick: false,
          autolink: true,
          HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer' },
        },
      }),
      TextStyleKit,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
        alignments: ['left', 'center', 'right'],
        defaultAlignment: 'left',
      }),
      IndentExt,
      TableKit.configure({
        table: { resizable: true },
      }),
      Highlight.configure({ multicolor: true }),
      TaskList.configure({
        HTMLAttributes: { class: 'task-list' },
      }),
      TaskItem.configure({
        nested: true,
        HTMLAttributes: { class: 'task-item' },
      }),
      Subscript,
      Superscript,
      Placeholder.configure({ placeholder }),
      Image.configure({
        allowBase64: true,
        HTMLAttributes: {
          class: 'editor-image rounded-xl max-w-full my-4 border border-slate-200',
        },
      }),
    ],
    content: markdownToHtml(prepareTermsMarkdown(value || '')),
    editorProps: {
      attributes: {
        class: 'tiptap tc-markdown-body wysiwyg-editor w-full min-h-[280px] px-4 py-5 outline-none',
      },
    },
    onCreate: ({ editor: ed }) => {
      calculateStats(ed.getHTML());
      lastMarkdownRef.current = value || '';
    },
    onUpdate: ({ editor: ed }) => {
      if (isExternalRef.current) return;
      const html = ed.getHTML();
      const markdown = htmlToMarkdown(html);
      lastMarkdownRef.current = markdown;
      calculateStats(html);
      onChange?.({ target: { value: markdown } });
    },
  });

  // Sync when parent value changes from outside
  useEffect(() => {
    if (!editor) return;
    const currentValue = value || '';
    if (currentValue === lastMarkdownRef.current) return;
    isExternalRef.current = true;
    const html = markdownToHtml(prepareTermsMarkdown(currentValue));
    editor.commands.setContent(html, { emitUpdate: false });
    lastMarkdownRef.current = currentValue;
    calculateStats(html);
    queueMicrotask(() => {
      isExternalRef.current = false;
    });
  }, [value, editor, calculateStats]);

  useEffect(() => {
    const handleClick = (e) => {
      if (!e.target.closest('.editor-dropdown-container')) setActiveDropdown(null);
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  useEffect(() => {
    if (!showLinkModal) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setShowLinkModal(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [showLinkModal]);

  if (!editor) {
    return (
      <div className="border border-slate-200 dark:border-white/10 rounded-2xl min-h-[420px] bg-slate-50 dark:bg-[#020617] animate-pulse" />
    );
  }

  const run = (fn) => () => {
    fn();
    setActiveDropdown(null);
  };

  const handleInsertLink = () => {
    const href = linkUrl.trim();
    if (!href) return;
    const { empty } = editor.state.selection;
    if (empty) {
      editor
        .chain()
        .focus()
        .insertContent(`<a href="${href}" target="_blank" rel="noopener noreferrer">${href}</a>`)
        .run();
    } else {
      editor.chain().focus().extendMarkRange('link').setLink({ href }).run();
    }
    setLinkUrl('');
    setShowLinkModal(false);
  };

  const openLinkModal = () => {
    const prev = editor.getAttributes('link').href || '';
    setLinkUrl(prev);
    setShowLinkModal(true);
  };

  const ToolbarBtn = ({ onClick, active, disabled, title, children, className = '' }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`p-1.5 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
        active
          ? 'bg-white text-indigo-600 dark:bg-indigo-500/25 dark:text-indigo-400 shadow-sm'
          : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-white dark:hover:bg-white/5'
      } ${className}`}
    >
      {children}
    </button>
  );

  const isNormal = !editor.isActive('heading') && !editor.isActive('codeBlock');

  return (
    <div className="relative border border-slate-200 dark:border-white/10 rounded-2xl bg-white dark:bg-[#020617] focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all shadow-sm">
      {/* Sticky chrome: toolbar + link panel stay at top of editor */}
      <div className="rte-toolbar sticky top-0 z-50 rounded-t-2xl overflow-visible shadow-sm">
      <div
        className="flex flex-nowrap items-center gap-1 p-2 border-b border-slate-200 dark:border-white/10 select-none overflow-visible"
        onMouseDown={(e) => {
          // Keep editor focus by preventing focus transfer, except for inputs/textareas
          if (!e.target.closest('input, textarea')) {
            e.preventDefault();
          }
        }}
      >
        {/* Undo / Redo */}
        <div className="flex items-center bg-slate-50 dark:bg-white/5 rounded-xl p-0.5 border border-slate-200/50 dark:border-white/5">
          <ToolbarBtn
            onClick={run(() => editor.chain().focus().undo().run())}
            disabled={!editor.can().undo()}
            title="Undo (Ctrl+Z)"
          >
            <Undo className="w-3.5 h-3.5" />
          </ToolbarBtn>
          <ToolbarBtn
            onClick={run(() => editor.chain().focus().redo().run())}
            disabled={!editor.can().redo()}
            title="Redo (Ctrl+Y)"
          >
            <Redo className="w-3.5 h-3.5" />
          </ToolbarBtn>
        </div>

        <div className="w-[1px] h-5 bg-slate-200 dark:bg-white/10" />

        {/* Font Family */}
        <div className="relative editor-dropdown-container">
          <button
            type="button"
            onClick={() => setActiveDropdown(activeDropdown === 'font' ? null : 'font')}
            title="Font Family"
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all ${
              activeDropdown === 'font'
                ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-500/20 dark:border-indigo-500/30 dark:text-indigo-300'
                : 'bg-white dark:bg-[#020617] border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
            }`}
          >
            <Type className="w-3.5 h-3.5" />
            <span className="whitespace-nowrap">Font</span>
          </button>
          {activeDropdown === 'font' && (
            <div className="editor-dropdown-menu absolute left-0 top-full mt-1.5 w-48 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 rounded-xl shadow-xl z-[70] p-1.5 max-h-64 overflow-y-auto custom-scrollbar">
              {FONT_FAMILIES.map((font) => (
                <button
                  key={font.name}
                  type="button"
                  onClick={run(() => {
                    if (font.value) editor.chain().focus().setFontFamily(font.value).run();
                    else editor.chain().focus().unsetFontFamily().run();
                  })}
                  className={`w-full text-left px-3 py-2 text-xs font-medium rounded-lg transition-colors hover:bg-slate-100 dark:hover:bg-white/5 ${
                    font.value
                      ? editor.isActive('textStyle', { fontFamily: font.value })
                        ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300'
                        : 'text-slate-700 dark:text-slate-300'
                      : !editor.getAttributes('textStyle').fontFamily
                        ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300'
                        : 'text-slate-700 dark:text-slate-300'
                  }`}
                  style={font.value ? { fontFamily: font.value } : undefined}
                >
                  {font.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Font Size */}
        <div className="relative editor-dropdown-container">
          <button
            type="button"
            onClick={() => setActiveDropdown(activeDropdown === 'fontSize' ? null : 'fontSize')}
            title="Font Size"
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all ${
              activeDropdown === 'fontSize'
                ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-500/20 dark:border-indigo-500/30 dark:text-indigo-300'
                : 'bg-white dark:bg-[#020617] border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
            }`}
          >
            <span className="text-xs font-black">A±</span>
            <span className="whitespace-nowrap">Size</span>
          </button>
          {activeDropdown === 'fontSize' && (
            <div className="editor-dropdown-menu absolute left-0 top-full mt-1.5 w-36 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 rounded-xl shadow-xl z-[70] p-1.5 max-h-60 overflow-y-auto custom-scrollbar">
              {FONT_SIZES.map((size) => {
                const current = editor.getAttributes('textStyle').fontSize || null;
                const active = current === size.value || (!size.value && !current);
                return (
                  <button
                    key={size.name}
                    type="button"
                    onClick={run(() => {
                      if (size.value) editor.chain().focus().setFontSize(size.value).run();
                      else editor.chain().focus().unsetFontSize().run();
                    })}
                    className={`w-full text-left px-3 py-2 text-xs font-medium rounded-lg transition-colors hover:bg-slate-100 dark:hover:bg-white/5 ${
                      active
                        ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300'
                        : 'text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {size.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Heading selector — H ▾ dropdown (TipTap-style) */}
        <div className="relative editor-dropdown-container">
          <button
            type="button"
            onClick={() => setActiveDropdown(activeDropdown === 'heading' ? null : 'heading')}
            title="Headings"
            className={`flex items-center gap-0.5 h-8 px-2.5 rounded-lg transition-all ${
              editor.isActive('heading') || activeDropdown === 'heading'
                ? 'bg-slate-200/90 text-slate-900 dark:bg-white/15 dark:text-white'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/10'
            }`}
          >
            <span className="text-[15px] font-black leading-none tracking-tight">H</span>
            <ChevronDown className="w-3.5 h-3.5 opacity-60" strokeWidth={2.5} />
          </button>

          {activeDropdown === 'heading' && (
            <div className="editor-dropdown-menu absolute left-0 top-full mt-1.5 w-[11.5rem] bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 rounded-xl shadow-[0_8px_30px_rgba(15,23,42,0.12)] z-[70] overflow-hidden py-1">
              {[1, 2, 3, 4, 5, 6].map((level) => {
                const active = editor.isActive('heading', { level });
                return (
                  <button
                    key={level}
                    type="button"
                    onClick={() => {
                      editor.chain().focus().setHeading({ level }).run();
                      setActiveDropdown(null);
                    }}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-left transition-colors ${
                      active
                        ? 'bg-slate-100 text-slate-900 dark:bg-white/10 dark:text-white'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5'
                    }`}
                  >
                    <span
                      className="inline-flex items-baseline justify-center w-6 shrink-0 text-slate-800 dark:text-slate-100"
                      aria-hidden
                    >
                      <span className="text-[14px] font-black leading-none">H</span>
                      <span className="text-[9px] font-bold leading-none relative top-px">{level}</span>
                    </span>
                    <span className="text-[13px] font-medium">Heading {level}</span>
                  </button>
                );
              })}
              <div className="my-1 mx-2 border-t border-slate-100 dark:border-white/10" />
              <button
                type="button"
                onClick={() => {
                  editor.chain().focus().setParagraph().run();
                  setActiveDropdown(null);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-left transition-colors ${
                  isNormal
                    ? 'bg-slate-100 text-slate-900 dark:bg-white/10 dark:text-white'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5'
                }`}
              >
                <span className="w-6 shrink-0 text-center text-[12px] font-bold text-slate-500">P</span>
                <span className="text-[13px] font-medium">Normal</span>
              </button>
            </div>
          )}
        </div>

        <div className="w-[1px] h-5 bg-slate-200 dark:bg-white/10" />

        {/* Inline marks */}
        <div className="flex items-center bg-slate-50 dark:bg-white/5 rounded-xl p-0.5 border border-slate-200/50 dark:border-white/5">
          <ToolbarBtn
            onClick={run(() => editor.chain().focus().toggleBold().run())}
            active={editor.isActive('bold')}
            title="Bold"
          >
            <Bold className="w-3.5 h-3.5" />
          </ToolbarBtn>
          <ToolbarBtn
            onClick={run(() => editor.chain().focus().toggleItalic().run())}
            active={editor.isActive('italic')}
            title="Italic"
          >
            <Italic className="w-3.5 h-3.5" />
          </ToolbarBtn>
          <ToolbarBtn
            onClick={run(() => editor.chain().focus().toggleUnderline().run())}
            active={editor.isActive('underline')}
            title="Underline"
          >
            <UnderlineIcon className="w-3.5 h-3.5" />
          </ToolbarBtn>
          <ToolbarBtn
            onClick={run(() => editor.chain().focus().toggleStrike().run())}
            active={editor.isActive('strike')}
            title="Strikethrough"
          >
            <Strikethrough className="w-3.5 h-3.5" />
          </ToolbarBtn>
        </div>

        {/* Text Color */}
        <div className="relative editor-dropdown-container">
          <button
            type="button"
            onClick={() => setActiveDropdown(activeDropdown === 'color' ? null : 'color')}
            title="Text Color"
            className={`p-2 rounded-xl border transition-all ${
              activeDropdown === 'color' || editor.getAttributes('textStyle').color
                ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-500/20 dark:border-indigo-500/30'
                : 'bg-white dark:bg-[#020617] border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
          </button>
          {activeDropdown === 'color' && (
            <div className="editor-dropdown-menu absolute left-0 top-full mt-1.5 w-44 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 rounded-xl shadow-xl z-[70] p-2">
              <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 px-1">
                Text Color
              </span>
              <div className="grid grid-cols-4 gap-1.5">
                {TEXT_COLORS.map((color) => (
                  <button
                    key={color.name}
                    type="button"
                    title={color.name}
                    onClick={run(() => {
                      if (color.value) editor.chain().focus().setColor(color.value).run();
                      else editor.chain().focus().unsetColor().run();
                    })}
                    className="w-6 h-6 rounded-md border border-slate-200 dark:border-white/10 hover:scale-110 active:scale-95 transition-transform"
                    style={{
                      backgroundColor: color.value || '#fff',
                      backgroundImage: !color.value
                        ? 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)'
                        : undefined,
                      backgroundSize: !color.value ? '8px 8px' : undefined,
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Highlight */}
        <div className="relative editor-dropdown-container">
          <button
            type="button"
            onClick={() => setActiveDropdown(activeDropdown === 'highlight' ? null : 'highlight')}
            title="Highlight Color"
            className={`p-2 rounded-xl border transition-all ${
              activeDropdown === 'highlight' || editor.isActive('highlight')
                ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-500/20 dark:border-indigo-500/30'
                : 'bg-white dark:bg-[#020617] border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
            }`}
          >
            <Highlighter className="w-3.5 h-3.5" />
          </button>
          {activeDropdown === 'highlight' && (
            <div className="absolute left-0 mt-1.5 w-40 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 rounded-xl shadow-xl z-30 p-2">
              <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 px-1">
                Highlight
              </span>
              <div className="grid grid-cols-4 gap-1.5">
                {HIGHLIGHT_COLORS.map((color) => (
                  <button
                    key={color.name}
                    type="button"
                    title={color.name}
                    onClick={run(() => {
                      if (color.value) editor.chain().focus().toggleHighlight({ color: color.value }).run();
                      else editor.chain().focus().unsetHighlight().run();
                    })}
                    className="w-6 h-6 rounded-md border border-slate-200 dark:border-white/10 hover:scale-110 active:scale-95 transition-transform"
                    style={{
                      backgroundColor: color.value || 'white',
                      backgroundImage: !color.value
                        ? 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)'
                        : 'none',
                      backgroundSize: '8px 8px',
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="w-[1px] h-5 bg-slate-200 dark:bg-white/10" />

        {/* Sub / Sup / Inline code */}
        <div className="flex items-center bg-slate-50 dark:bg-white/5 rounded-xl p-0.5 border border-slate-200/50 dark:border-white/5">
          <ToolbarBtn
            onClick={run(() => editor.chain().focus().unsetSuperscript().toggleSubscript().run())}
            active={editor.isActive('subscript')}
            title="Subscript"
          >
            <SubIcon className="w-3.5 h-3.5" />
          </ToolbarBtn>
          <ToolbarBtn
            onClick={run(() => editor.chain().focus().unsetSubscript().toggleSuperscript().run())}
            active={editor.isActive('superscript')}
            title="Superscript"
          >
            <SupIcon className="w-3.5 h-3.5" />
          </ToolbarBtn>
          <ToolbarBtn
            onClick={run(() => editor.chain().focus().toggleCode().run())}
            active={editor.isActive('code')}
            title="Inline Code"
          >
            <Code className="w-3.5 h-3.5" />
          </ToolbarBtn>
        </div>

        <div className="w-[1px] h-5 bg-slate-200 dark:bg-white/10" />

        {/* Lists dropdown + Blockquote + Code Block */}
        <div className="flex items-center bg-slate-50 dark:bg-white/5 rounded-xl p-0.5 border border-slate-200/50 dark:border-white/5">
          <div className="relative editor-dropdown-container">
            <button
              type="button"
              onClick={() => setActiveDropdown(activeDropdown === 'list' ? null : 'list')}
              title="Lists"
              className={`flex items-center gap-0.5 p-1.5 rounded-lg transition-colors ${
                editor.isActive('bulletList') ||
                editor.isActive('orderedList') ||
                editor.isActive('taskList') ||
                activeDropdown === 'list'
                  ? 'bg-white text-indigo-600 dark:bg-indigo-500/25 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-white dark:hover:bg-white/5'
              }`}
            >
              {editor.isActive('orderedList') ? (
                <ListOrdered className="w-3.5 h-3.5" />
              ) : editor.isActive('taskList') ? (
                <ListChecks className="w-3.5 h-3.5" />
              ) : (
                <List className="w-3.5 h-3.5" />
              )}
              <ChevronDown className="w-3 h-3 opacity-70" />
            </button>
            {activeDropdown === 'list' && (
              <div className="absolute left-0 mt-1.5 w-44 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 rounded-xl shadow-xl z-30 p-1.5">
                <button
                  type="button"
                  onClick={run(() => editor.chain().focus().toggleBulletList().run())}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-lg transition-colors hover:bg-slate-100 dark:hover:bg-white/5 ${
                    editor.isActive('bulletList')
                      ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300'
                      : 'text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <List className="w-3.5 h-3.5 shrink-0" />
                  Bullet List
                </button>
                <button
                  type="button"
                  onClick={run(() => editor.chain().focus().toggleOrderedList().run())}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-lg transition-colors hover:bg-slate-100 dark:hover:bg-white/5 ${
                    editor.isActive('orderedList')
                      ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300'
                      : 'text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <ListOrdered className="w-3.5 h-3.5 shrink-0" />
                  Ordered List
                </button>
                <button
                  type="button"
                  onClick={run(() => editor.chain().focus().toggleTaskList().run())}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-lg transition-colors hover:bg-slate-100 dark:hover:bg-white/5 ${
                    editor.isActive('taskList')
                      ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300'
                      : 'text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <ListChecks className="w-3.5 h-3.5 shrink-0" />
                  Task List
                </button>
              </div>
            )}
          </div>

          <ToolbarBtn
            onClick={run(() => editor.chain().focus().toggleBlockquote().run())}
            active={editor.isActive('blockquote')}
            title="Blockquote"
          >
            <Quote className="w-3.5 h-3.5" />
          </ToolbarBtn>

          <ToolbarBtn
            onClick={run(() => editor.chain().focus().toggleCodeBlock().run())}
            active={editor.isActive('codeBlock')}
            title="Code Block"
          >
            <CodeXml className="w-3.5 h-3.5" />
          </ToolbarBtn>

          <ToolbarBtn
            onClick={run(() => editor.chain().focus().setHorizontalRule().run())}
            title="Divider"
          >
            <Minus className="w-3.5 h-3.5" />
          </ToolbarBtn>
        </div>

        <div className="w-[1px] h-5 bg-slate-200 dark:bg-white/10" />

        {/* Alignment */}
        <div className="flex items-center bg-slate-50 dark:bg-white/5 rounded-xl p-0.5 border border-slate-200/50 dark:border-white/5">
          <ToolbarBtn
            onClick={run(() => editor.chain().focus().setTextAlign('left').run())}
            active={editor.isActive({ textAlign: 'left' })}
            title="Align Left"
          >
            <AlignLeft className="w-3.5 h-3.5" />
          </ToolbarBtn>
          <ToolbarBtn
            onClick={run(() => editor.chain().focus().setTextAlign('center').run())}
            active={editor.isActive({ textAlign: 'center' })}
            title="Align Center"
          >
            <AlignCenter className="w-3.5 h-3.5" />
          </ToolbarBtn>
          <ToolbarBtn
            onClick={run(() => editor.chain().focus().setTextAlign('right').run())}
            active={editor.isActive({ textAlign: 'right' })}
            title="Align Right"
          >
            <AlignRight className="w-3.5 h-3.5" />
          </ToolbarBtn>
        </div>

        <div className="w-[1px] h-5 bg-slate-200 dark:bg-white/10" />

        {/* Indent */}
        <div className="flex items-center bg-slate-50 dark:bg-white/5 rounded-xl p-0.5 border border-slate-200/50 dark:border-white/5">
          <ToolbarBtn
            onClick={run(() => editor.chain().focus().outdent().run())}
            title="Decrease Indent"
          >
            <Outdent className="w-3.5 h-3.5" />
          </ToolbarBtn>
          <ToolbarBtn
            onClick={run(() => editor.chain().focus().indent().run())}
            title="Increase Indent"
          >
            <Indent className="w-3.5 h-3.5" />
          </ToolbarBtn>
        </div>

        <div className="w-[1px] h-5 bg-slate-200 dark:bg-white/10" />

        {/* Link / Clear */}
        <div className="flex items-center shrink-0 bg-slate-50 dark:bg-white/5 rounded-xl p-0.5 border border-slate-200/50 dark:border-white/5">
          <ToolbarBtn onClick={openLinkModal} active={editor.isActive('link')} title="Insert Link">
            <Link2 className="w-3.5 h-3.5" />
          </ToolbarBtn>
          <ToolbarBtn
            onClick={run(() =>
              editor.chain().focus().unsetAllMarks().clearNodes().setParagraph().run()
            )}
            title="Clear Formatting"
          >
            <Eraser className="w-3.5 h-3.5" />
          </ToolbarBtn>
        </div>
      </div>

      {showLinkModal && (
        <div
          className="border-b border-slate-200 dark:border-white/10 bg-indigo-50/80 dark:bg-indigo-500/10 px-3 py-2.5"
          role="dialog"
          aria-labelledby="rte-link-dialog-title"
        >
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <Link2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span
                id="rte-link-dialog-title"
                className="text-[11px] font-bold text-slate-700 dark:text-slate-200 whitespace-nowrap"
              >
                Insert Link
              </span>
              <input
                type="url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://example.com"
                className="min-w-0 flex-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#020617] text-sm text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-400"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleInsertLink();
                  }
                }}
                autoFocus
              />
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleInsertLink}
                disabled={!linkUrl.trim()}
                className="px-3 py-1.5 bg-indigo-600 text-white text-[11px] font-bold rounded-lg hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Insert
              </button>
              {editor.isActive('link') && (
                <button
                  type="button"
                  onClick={() => {
                    editor.chain().focus().unsetLink().run();
                    setShowLinkModal(false);
                  }}
                  className="px-3 py-1.5 bg-red-50 text-red-600 text-[11px] font-bold rounded-lg hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 transition-colors"
                >
                  Remove
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowLinkModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-white/80 dark:hover:text-white dark:hover:bg-white/10 transition-colors"
                aria-label="Close"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
      </div>

      <EditorContent editor={editor} className="w-full" />

      <div className="flex items-center justify-between px-6 py-2.5 bg-slate-50/95 dark:bg-[#0f172a]/95 border-t border-slate-200 dark:border-white/10 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest select-none rounded-b-2xl">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <BarChart3 className="w-3 h-3 text-indigo-500" />
            {stats.words} words
          </span>
          <span>•</span>
          <span>{stats.characters} characters</span>
          <span>•</span>
          <span>{stats.readTime} min read</span>
        </div>
      </div>
    </div>
  );
}
