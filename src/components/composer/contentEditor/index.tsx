/*
 * Copyright (C) 2026 Yukthi Systems Private Limited
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License version 3
 * as published by the Free Software Foundation.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * version 3 along with this program. If not, see
 * <https://www.gnu.org/licenses/>.
 */

import { Card, Flex } from '@radix-ui/themes';
import { useEditor, Editor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import MenuBar from './MenuBar';
import { Underline } from '@tiptap/extension-underline';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableCell } from '@tiptap/extension-table-cell';
import TableContextMenu from './TableContextMenu';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import { Node, mergeAttributes, Mark } from '@tiptap/core';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Blockquote from '@tiptap/extension-blockquote';
import { useEffect, useRef, useState } from 'react';
import { useAtomValue } from 'jotai';
import { userSettingsAtom } from '../../../state/settings';
import { OrderedList } from '@tiptap/extension-ordered-list';
import { BulletList } from '@tiptap/extension-bullet-list';
import { ListItem } from '@tiptap/extension-list-item';
import { FaCode, FaEye, FaPencilAlt } from 'react-icons/fa';
import { InfoTooltip } from './InfoTooltip';
import { SlashCommands } from './SlashCommands';

export type ContentEditorProps = {
  onChange: (value: { html: string; text: string }) => void;
  value: string;
  height?: string;
  maxheight?: string;
};

type EditorMode = 'richtext' | 'code' | 'preview';

// --- Custom TextStyle with fontSize + backgroundColor support ---

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    customTextStyle: {
      setFontSize: (size: string) => ReturnType;
      unsetFontSize: () => ReturnType;
      setBackgroundColor: (color: string) => ReturnType;
      unsetBackgroundColor: () => ReturnType;
      setFontFamily: (family: string) => ReturnType;
      unsetFontFamily: () => ReturnType;
    };
  }
}

const CustomTextStyle = TextStyle.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      fontSize: {
        default: null,
        parseHTML: (el) => el.style.fontSize || null,
        renderHTML: ({ fontSize }) => (fontSize ? { style: `font-size: ${fontSize}` } : {}),
      },
      backgroundColor: {
        default: null,
        parseHTML: (el) => el.style.backgroundColor || null,
        renderHTML: ({ backgroundColor }) =>
          backgroundColor ? { style: `background-color: ${backgroundColor}` } : {},
      },
      fontFamily: {
        default: null,
        parseHTML: (el) => el.style.fontFamily || null,
        renderHTML: ({ fontFamily }) => (fontFamily ? { style: `font-family: ${fontFamily}` } : {}),
      },
    };
  },

  addCommands() {
    return {
      ...this.parent?.(),
      setFontSize:
        (fontSize: string) =>
        ({ chain }: any) =>
          chain().setMark('textStyle', { fontSize }).run(),

      unsetFontSize:
        () =>
        ({ chain }: any) =>
          chain().setMark('textStyle', { fontSize: null }).run(),

      setBackgroundColor:
        (backgroundColor: string) =>
        ({ chain }: any) =>
          chain().setMark('textStyle', { backgroundColor }).run(),

      unsetBackgroundColor:
        () =>
        ({ chain }: any) =>
          chain().setMark('textStyle', { backgroundColor: null }).run(),

      setFontFamily:
        (fontFamily: string) =>
        ({ chain }: any) =>
          chain().setMark('textStyle', { fontFamily }).run(),

      unsetFontFamily:
        () =>
        ({ chain }: any) =>
          chain().setMark('textStyle', { fontFamily: null }).run(),
    };
  },
});

// --- Custom Extensions ---

const CustomBlockquote = Blockquote.extend({
  addAttributes() {
    return {
      style: {
        default: null,
        parseHTML: (element) => element.getAttribute('style'),
        renderHTML: (attributes) => {
          if (!attributes.style) return {};
          return { style: attributes.style };
        },
      },
    };
  },
});

const InlineStyle = Mark.create({
  name: 'inlineStyle',
  parseHTML() {
    return [
      {
        tag: 'span',
        getAttrs: (element) => {
          if (typeof element === 'string') return false;
          const style = element.getAttribute('style');
          return style ? { style } : false;
        },
      },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    return ['span', HTMLAttributes, 0];
  },
  addAttributes() {
    return {
      style: {
        default: null,
        parseHTML: (element) => element.getAttribute('style'),
        renderHTML: (attributes) => {
          if (!attributes.style) return {};
          return { style: attributes.style };
        },
      },
    };
  },
});

const PreserveBodyStyle = Node.create({
  name: 'bodyDiv',
  group: 'block',
  content: 'block*',
  parseHTML() {
    return [{ tag: 'body', priority: 100 }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes), 0];
  },
  addAttributes() {
    return {
      style: {
        default: null,
        parseHTML: (element) => element.getAttribute('style'),
        renderHTML: (attributes) => {
          if (!attributes.style) return {};
          return { style: attributes.style };
        },
      },
    };
  },
});

const Div = Node.create({
  name: 'div',
  group: 'block',
  content: 'block*',
  parseHTML() {
    return [{ tag: 'div' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes), 0];
  },
  addAttributes() {
    return {
      style: {
        default: null,
        parseHTML: (element) => element.getAttribute('style'),
        renderHTML: (attributes) => {
          if (!attributes.style) return {};
          return { style: attributes.style };
        },
      },
      class: {
        default: null,
        parseHTML: (element) => element.getAttribute('class'),
        renderHTML: (attributes) => {
          if (!attributes.class) return {};
          return { class: attributes.class };
        },
      },
    };
  },
});

const CustomTable = Table.extend({
  renderHTML({ HTMLAttributes }) {
    return [
      'table',
      {
        style: 'border-collapse: collapse; width: 100%; margin: 12px 0; border: 1px solid #ddd;',
        ...HTMLAttributes,
      },
      ['tbody', 0],
    ];
  },
});

const CustomTableCell = TableCell.extend({
  renderHTML({ HTMLAttributes }) {
    return [
      'td',
      {
        style: 'border: 1px solid #ddd; padding: 8px; position: relative;',
        ...HTMLAttributes,
      },
      0,
    ];
  },
});

const CustomTableHeader = TableHeader.extend({
  renderHTML({ HTMLAttributes }) {
    return [
      'th',
      {
        style: 'border: 1px solid #ddd; padding: 8px; background-color: #f8f9fa; font-weight: 600;',
        ...HTMLAttributes,
      },
      0,
    ];
  },
});

// --- ROBUST IMAGE EXTENSION ---
const CustomImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      src: {
        default: null,
      },
      alt: {
        default: null,
      },
      width: {
        default: null,
        parseHTML: (element) => element.getAttribute('width') || element.style.width,
      },
      height: {
        default: null,
        parseHTML: (element) => element.getAttribute('height') || element.style.height,
      },
      style: {
        default: 'max-width: 100%; height: auto; border-radius: 4px; margin: 8px 0;',
        parseHTML: (element) => element.getAttribute('style'),
      },
    };
  },

  renderHTML({ HTMLAttributes }) {
    const { width, height, style } = HTMLAttributes;

    let styleString = style || 'max-width: 100%; height: auto; border-radius: 4px; margin: 8px 0;';

    styleString = styleString.replace(/(^|[;\s])width:\s*[^;]+;?/gi, '$1').trim();

    if (width) {
      styleString = `width: ${width}px; ` + styleString;
    }

    if (height) {
      styleString = styleString.replace(/(^|[;\s])height:\s*[^;]+;?/gi, '$1').trim();
      styleString = `height: ${height}px; ` + styleString;
    }

    return [
      'img',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, { style: styleString }),
    ];
  },

  addNodeView() {
    return ({ node, editor, getPos }) => {
      const container = document.createElement('div');
      container.className = 'image-resizer-container';
      container.style.cssText = 'position: relative; display: inline-block; max-width: 100%;';

      const img = document.createElement('img');
      img.src = node.attrs.src;
      img.alt = node.attrs.alt || '';

      let imgStyle =
        node.attrs.style ||
        'max-width: 100%; height: auto; border-radius: 4px; margin: 8px 0; display: block;';
      if (node.attrs.width) {
        img.width = parseInt(node.attrs.width, 10);
        imgStyle =
          `width: ${node.attrs.width}px; ` + imgStyle.replace(/(^|[;\s])width:\s*[^;]+;?/gi, '$1');
      }

      img.style.cssText = imgStyle;
      if (node.attrs.height) img.height = parseInt(node.attrs.height, 10);

      const resizeHandle = document.createElement('div');
      resizeHandle.className = 'image-resize-handle';
      resizeHandle.style.cssText = `
        position: absolute;
        bottom: 0;
        right: 0;
        width: 12px;
        height: 12px;
        background: var(--accent-9);
        border: 2px solid white;
        border-radius: 50%;
        cursor: nwse-resize;
        opacity: 0;
        transition: opacity 0.2s;
        z-index: 10;
      `;

      container.appendChild(img);
      container.appendChild(resizeHandle);

      let isResizing = false;
      let startX = 0;
      let startWidth = 0;

      const onMouseDown = (e: MouseEvent) => {
        e.preventDefault();
        isResizing = true;
        startX = e.clientX;
        startWidth = img.width || img.offsetWidth;

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
      };

      const onMouseMove = (e: MouseEvent) => {
        if (!isResizing) return;
        const diff = e.clientX - startX;
        const newWidth = Math.max(100, Math.min(startWidth + diff, 800));

        img.width = newWidth;
        img.style.width = `${newWidth}px`;
      };

      const onMouseUp = () => {
        if (!isResizing) return;
        isResizing = false;

        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);

        if (typeof getPos === 'function') {
          const pos = getPos();
          const newWidth = img.width;

          editor.commands.command(({ tr }) => {
            const nodeAtPos = tr.doc.nodeAt(pos);
            if (nodeAtPos && nodeAtPos.type.name === 'image') {
              tr.setNodeMarkup(pos, undefined, {
                ...nodeAtPos.attrs,
                width: newWidth,
              });
              return true;
            }
            return false;
          });
        }
      };

      container.addEventListener('mouseenter', () => {
        resizeHandle.style.opacity = '1';
      });

      container.addEventListener('mouseleave', () => {
        if (!isResizing) {
          resizeHandle.style.opacity = '0';
        }
      });

      resizeHandle.addEventListener('mousedown', onMouseDown);

      return {
        dom: container,
        destroy: () => {
          resizeHandle.removeEventListener('mousedown', onMouseDown);
          document.removeEventListener('mousemove', onMouseMove);
          document.removeEventListener('mouseup', onMouseUp);
        },
      };
    };
  },
});

const CustomParagraph = Node.create({
  name: 'paragraph',
  priority: 1000,
  group: 'block',
  content: 'inline*',
  parseHTML() {
    return [{ tag: 'p' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['p', mergeAttributes(HTMLAttributes), 0];
  },
  addAttributes() {
    return {
      style: {
        default: null,
        parseHTML: (element) => element.getAttribute('style'),
        renderHTML: (attributes) => {
          if (!attributes.style) return {};
          return { style: attributes.style };
        },
      },
    };
  },
});

const CustomHeading = Node.create({
  name: 'heading',
  priority: 1000,
  group: 'block',
  content: 'inline*',
  defining: true,
  addOptions() {
    return { levels: [1, 2, 3, 4, 5, 6] };
  },
  addAttributes() {
    return {
      level: { default: 1, rendered: false },
      style: {
        default: null,
        parseHTML: (element) => element.getAttribute('style'),
        renderHTML: (attributes) => {
          if (!attributes.style) return {};
          return { style: attributes.style };
        },
      },
    };
  },
  parseHTML() {
    return this.options.levels.map((level: number) => ({
      tag: `h${level}`,
      attrs: { level },
    }));
  },
  renderHTML({ node, HTMLAttributes }) {
    const hasLevel = this.options.levels.includes(node.attrs.level);
    const level = hasLevel ? node.attrs.level : this.options.levels[0];
    return [`h${level}`, mergeAttributes(HTMLAttributes), 0];
  },
});

// --- MAIN COMPONENT ---

const ContentEditor = ({
  onChange,
  value,
  height = '100%',
  maxheight = '300px',
}: ContentEditorProps) => {
  const userSettings = useAtomValue(userSettingsAtom);
  const { show_insert_table_button = false, default_editor_tab = 'richtext' } =
    userSettings?.compose ?? {};

  const [mode, setMode] = useState<EditorMode>(default_editor_tab);
  // Local HTML string for code mode — kept in sync with value
  const [htmlCode, setHtmlCode] = useState(value || '');

  const editor: Editor | null = useEditor({
    extensions: [
      StarterKit.configure({
        paragraph: false,
        heading: false,
        blockquote: false,
        orderedList: false,
        bulletList: false,
        listItem: false,
      }),
      OrderedList.extend({
        addInputRules() {
          return [];
        },
      }),
      BulletList.extend({
        addInputRules() {
          return [];
        },
      }),
      ListItem,
      CustomParagraph,
      CustomHeading,
      CustomBlockquote,
      Underline,
      SlashCommands,
      CustomTextStyle,
      Color,
      Div,
      InlineStyle,
      PreserveBodyStyle,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          target: '_blank',
          rel: 'noopener noreferrer',
        },
      }),
      CustomTable.configure({
        resizable: true,
      }),
      TableRow,
      CustomTableHeader,
      CustomTableCell,
      CustomImage.configure({
        inline: true,
        allowBase64: true,
      }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class: 'editor-content',
      },

      handleKeyDown: (view, event) => {
        if (event.key === '?' && !event.ctrlKey && !event.metaKey) {
          event.preventDefault();
          const { state, dispatch } = view;
          const tr = state.tr.insertText('?');
          dispatch(tr);
          return true;
        }
        return false;
      },
      transformPastedHTML(html) {
        return html;
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      setHtmlCode(html);
      onChange({ html, text: editor.getText() });
    },
  });

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value);
      if (mode !== 'code') {
        // ← add this guard
        setHtmlCode(value || '');
      }
    }
  }, [editor, value, mode]);

  // When switching TO richtext from code, apply the edited HTML back into the editor
  const handleModeSwitch = (newMode: EditorMode) => {
    if (newMode === 'richtext' && mode === 'code' && editor) {
      editor.commands.setContent(htmlCode);
      onChange({ html: htmlCode, text: editor.getText() });
    }
    if (newMode === 'code') {
      setHtmlCode(value); // ← was: editor.getHTML()
    }
    if (newMode === 'preview' && mode === 'richtext') {
      setHtmlCode(value); // ← ensure preview uses raw value, not stale htmlCode
    }
    setMode(newMode);
  };
  // Fix: clicks in CSS margin gaps get browser-snapped to the nearest content node above.
  // Use posAtCoords (pixel-based) to place cursor where the user actually clicked.
  useEffect(() => {
    if (!editor) return;
    const editorDom = editor.view.dom as HTMLElement;

    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Only intercept clicks on containers, not on actual text/inline nodes
      const isContainer =
        target === editorDom ||
        target.tagName === 'DIV' ||
        target.tagName === 'P' ||
        target.tagName === 'BR';
      if (!isContainer) return;

      const coordPos = editor.view.posAtCoords({ left: e.clientX, top: e.clientY });
      if (!coordPos) return;

      // Let the browser's mousedown finish, then override the cursor position
      setTimeout(() => {
        if (editor.isDestroyed) return;
        editor.commands.setTextSelection(coordPos.pos);
      }, 0);
    };

    editorDom.addEventListener('mousedown', onMouseDown);
    return () => editorDom.removeEventListener('mousedown', onMouseDown);
  }, [editor]);

  const modeButtons: { mode: EditorMode; icon: React.ReactNode; title: string }[] = [
    { mode: 'richtext', icon: <FaPencilAlt size={10} />, title: 'Rich Text' },
    { mode: 'code', icon: <FaCode size={10} />, title: 'HTML' },
    { mode: 'preview', icon: <FaEye size={10} />, title: 'Preview' },
  ];

  return (
    <Flex direction="column" gap="2">
      <Card style={{ position: 'relative' }}>
        {/* ── mode toggle: small pills overlaid top-right ── */}
        <div
          style={{
            position: 'absolute',
            top: 2,
            right: 2,
            zIndex: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          {/* Info tooltip — separate from the pill group */}
          <InfoTooltip />

          {/* Mode pills */}
          <div
            style={{
              display: 'flex',
              gap: 2,
              background: 'var(--gray-3)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              borderRadius: 6,
              padding: 2,
              border: '1px solid var(--gray-6)',
            }}
          >
            {modeButtons.map((btn) => (
              <button
                key={btn.mode}
                type="button"
                title={btn.title}
                onClick={() => handleModeSwitch(btn.mode)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 3,
                  padding: '2px 6px',
                  fontSize: 10,
                  fontWeight: 500,
                  borderRadius: 4,
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  background: mode === btn.mode ? 'var(--color-panel-solid)' : 'transparent',
                  color: mode === btn.mode ? 'var(--gray-12)' : 'var(--gray-10)',
                  boxShadow: mode === btn.mode ? '0 1px 3px var(--gray-a4)' : 'none',
                  backdropFilter: mode === btn.mode ? 'blur(4px)' : 'none',
                }}
              >
                {btn.icon}
                {btn.title}
              </button>
            ))}
          </div>
        </div>

        {/* ── rich text ── */}
        {mode === 'richtext' && (
          <>
            <EditorContent editor={editor} />
            <MenuBar editor={editor} />
            {editor && show_insert_table_button && <TableContextMenu editor={editor} />}
          </>
        )}

        {/* ── HTML code ── */}
        {mode === 'code' && (
          <textarea
            value={htmlCode}
            onChange={(e) => {
              setHtmlCode(e.target.value);
              onChange({ html: e.target.value, text: e.target.value.replace(/<[^>]*>/g, '') });
            }}
            spellCheck={false}
            style={{
              width: '100%',
              height,
              minHeight: 150,
              maxHeight: maxheight,
              fontFamily: 'monospace',
              fontSize: 12,
              padding: '0.75rem',
              background: 'var(--gray-2)',
              color: 'var(--gray-12)',
              border: 'none',
              outline: 'none',
              resize: 'none',
              boxSizing: 'border-box',
              overflowY: 'auto',
            }}
          />
        )}

        {/* ── preview ── */}
        {mode === 'preview' && (
          <iframe
            srcDoc={htmlCode}
            style={{
              width: '100%',
              height,
              minHeight: 150,
              maxHeight: maxheight,
              border: 'none',
              display: 'block',
            }}
            sandbox="allow-same-origin"
            title="Email Preview"
          />
        )}
      </Card>
      <style>
        {`.editor-content {
  padding: 0.75rem;
  height: ${height};
  min-height: 150px;
  max-height: ${maxheight};
  width: 100%;
  overflow-y: auto;
  box-sizing: border-box;
  outline: none;
}
.editor-content:focus{
  outline: none;
}

.editor-content ul {
  list-style-type: disc;
  padding-left: 1.5rem;
  margin: 1rem 0;
}

.editor-content ol {
  list-style-type: decimal;
  padding-left: 1.5rem;
  margin: 1rem 0;
}

.editor-content li {
  margin-bottom: 0.25rem;
}

.editor-content li p {
  margin: 0;
  display: block;
}

/* Preserve inline styles in content */
.editor-content div[style],
.editor-content span[style],
.editor-content p[style],
.editor-content h1[style],
.editor-content h2[style],
.editor-content h3[style],
.editor-content h4[style],
.editor-content h5[style],
.editor-content h6[style],
.editor-content body[style],
.editor-content blockquote[style],
.editor-content a[style] {
  all: revert;
}

.editor-content > div[style] {
  all: revert;
  display: block;
}

.editor-content table {
  border-collapse: collapse;
  margin: 12px 0;
  width: 100%;
  table-layout: fixed;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.editor-content table td,
.editor-content table th {
  border: 1px solid #ddd;
  padding: 8px;
  min-width: 100px;
  vertical-align: top;
  position: relative;
  transition: background-color 0.2s;
}

.editor-content table th {
  background-color: #f8f9fa;
  font-weight: 600;
  color: #333;
}

.editor-content table tr:hover td {
  background-color: #f8f9fa;
}

.selectedCell {
  background-color: #e6f3ff !important;
}

/* Image styling */
.editor-content img {
  max-width: 100%;
  height: auto;
  border-radius: 4px;
  margin: 8px 0;
  cursor: pointer;
  transition: all 0.2s;
  display: inline-block;
}

.editor-content img:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.editor-content img.ProseMirror-selectednode {
  outline: 2px solid var(--accent-9);
  outline-offset: 2px;
}

.editor-content a {
  color: #0066cc;
  text-decoration: none;
}



.editor-content a:hover {
  text-decoration: underline;
}
  .editor-content p {
  min-height: 1em;
}

.table-context-menu {
  position: fixed;
  background: white;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: 6px;
  z-index: 1000;
  min-width: 180px;
  display: none;
}

.table-context-menu.visible {
  display: block;
}

.context-menu-item {
  padding: 8px 12px;
  margin: 2px 0;
  border: none;
  background: transparent;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  text-align: left;
  transition: all 0.2s;
  font-size: 14px;
}

.context-menu-item:hover {
  background: #f0f5ff;
}

.context-menu-item svg {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
}

@media (max-width: 1280px) {
  .editor-content {
    min-height: 150px;
  }
}

.context-menu-divider {
  height: 1px;
  background: #e5e7eb;
  margin: 6px 0;
}`}
      </style>
    </Flex>
  );
};

export default ContentEditor;
