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
import { Node, mergeAttributes, Mark, type CommandProps } from '@tiptap/core';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Blockquote from '@tiptap/extension-blockquote';
import { useCallback, useEffect, useRef, useState } from 'react';
import { QUOTE_ATTR } from '../../../utils/emailQuote';
import { useAtomValue } from 'jotai';
import { userSettingsAtom } from '../../../state/settings';
import { OrderedList } from '@tiptap/extension-ordered-list';
import { BulletList } from '@tiptap/extension-bullet-list';
import { ListItem } from '@tiptap/extension-list-item';
import { FaCode, FaEye, FaPencilAlt } from 'react-icons/fa';
import { InfoTooltip } from './InfoTooltip';
import { SlashCommands } from './SlashCommands';
import { GrammarCheckExtension } from './grammar/GrammarCheckExtension';
import { useGrammarCheck } from './grammar/useGrammarCheck';
import GrammarPanel from './grammar/GrammarPanel';
import GrammarCheckButton from './grammar/GrammarCheckButton';

export type ContentEditorProps = {
  onChange: (value: { html: string; text: string }) => void;
  value: string;
  height?: string;
  maxheight?: string;
  /**
   * Fills its parent: the toolbar stays fixed on top and only the text scrolls.
   * height / maxheight are ignored.
   */
  fill?: boolean;
  /**
   * Called with the editor's html each time content was loaded from outside
   * (not typed)
   */
  onContentLoaded?: (html: string) => void;
  /**
   * Puts the cursor on the first line once the content is loaded, so it's clear
   * where to start writing. Runs again only when this key changes.
   */
  focusStartKey?: string;
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
        ({ chain }: CommandProps) =>
          chain().setMark('textStyle', { fontSize }).run(),

      unsetFontSize:
        () =>
        ({ chain }: CommandProps) =>
          chain().setMark('textStyle', { fontSize: null }).run(),

      setBackgroundColor:
        (backgroundColor: string) =>
        ({ chain }: CommandProps) =>
          chain().setMark('textStyle', { backgroundColor }).run(),

      unsetBackgroundColor:
        () =>
        ({ chain }: CommandProps) =>
          chain().setMark('textStyle', { backgroundColor: null }).run(),

      setFontFamily:
        (fontFamily: string) =>
        ({ chain }: CommandProps) =>
          chain().setMark('textStyle', { fontFamily }).run(),

      unsetFontFamily:
        () =>
        ({ chain }: CommandProps) =>
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

/** The quoted original of a reply or forward, see utils/emailQuote.ts. */
const EmailQuote = Node.create({
  name: 'emailQuote',
  group: 'block',
  content: 'block+',
  // Backspace at the end of the reply doesn't merge it into the quote
  isolating: true,
  parseHTML() {
    return [{ tag: `div[${QUOTE_ATTR}]`, priority: 100 }];
  },
  renderHTML() {
    return ['div', { [QUOTE_ATTR]: '' }, 0];
  },
});

/** Attributes emails set on tables, kept so a quoted table keeps its look. */
const passThroughAttributes = (names: string[]) =>
  Object.fromEntries(
    names.map((name) => [
      name,
      {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute(name),
        renderHTML: (attributes: Record<string, unknown>) =>
          attributes[name] ? { [name]: attributes[name] } : {},
      },
    ])
  );

/**
 * Style: null means a table made in this editor, which gets the default look. A
 * table parsed from html keeps what it had, also no style at all: a quoted
 * layout table must not gain borders.
 */
const parsedStyleAttribute = {
  style: {
    default: null,
    parseHTML: (element: HTMLElement) => element.getAttribute('style') ?? '',
    renderHTML: (attributes: Record<string, unknown>) =>
      attributes.style ? { style: attributes.style } : {},
  },
};
const CELL_ATTRIBUTES = ['align', 'valign', 'bgcolor', 'width', 'height'];

const CustomTable = Table.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      ...parsedStyleAttribute,
      ...passThroughAttributes([
        'width',
        'align',
        'bgcolor',
        'border',
        'cellpadding',
        'cellspacing',
      ]),
    };
  },
  renderHTML({ node, HTMLAttributes }) {
    return [
      'table',
      {
        ...(node.attrs.style === null
          ? {
              style:
                'border-collapse: collapse; width: 100%; margin: 12px 0; border: 1px solid #ddd;',
            }
          : {}),
        ...HTMLAttributes,
      },
      ['tbody', 0],
    ];
  },
});

const CustomTableCell = TableCell.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      ...parsedStyleAttribute,
      ...passThroughAttributes(CELL_ATTRIBUTES),
    };
  },
  renderHTML({ node, HTMLAttributes }) {
    return [
      'td',
      {
        ...(node.attrs.style === null
          ? { style: 'border: 1px solid #ddd; padding: 8px; position: relative;' }
          : {}),
        ...HTMLAttributes,
      },
      0,
    ];
  },
});

const CustomTableHeader = TableHeader.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      ...parsedStyleAttribute,
      ...passThroughAttributes(CELL_ATTRIBUTES),
    };
  },
  renderHTML({ node, HTMLAttributes }) {
    return [
      'th',
      {
        ...(node.attrs.style === null
          ? {
              style:
                'border: 1px solid #ddd; padding: 8px; background-color: #f8f9fa; font-weight: 600;',
            }
          : {}),
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

// Long enough for a menu's closing animation
const FOCUS_RECHECK_MS = [100, 250, 500, 800];
const USER_FOCUS_EVENTS = ['pointerdown', 'keydown', 'wheel', 'touchmove'] as const;

// About 20 KB of text and markup: beyond this, syncing waits for a pause in typing
const LARGE_DOCUMENT_SIZE = 20_000;
const TYPING_PAUSE_MS = 200;

/** A card normally; in fill mode the window around it is the frame. */
const Frame = ({ fill, children }: { fill: boolean; children: React.ReactNode }) =>
  fill ? (
    <div className="relative h-full min-h-0 flex flex-col">{children}</div>
  ) : (
    <Card style={{ position: 'relative' }}>{children}</Card>
  );

/**
 * The editor's schema and behaviour. A function: each editor gets its own
 * instances.
 */
export const createEditorExtensions = () => [
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
  GrammarCheckExtension,
  CustomTextStyle,
  Color,
  EmailQuote,
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
    // Matches the td/th min-width below; sets the table's min-width so it scrolls
    cellMinWidth: 100,
  }),
  TableRow,
  CustomTableHeader,
  CustomTableCell,
  CustomImage.configure({
    inline: true,
    allowBase64: true,
  }),
];

const ContentEditor = ({
  onChange,
  value,
  height: fixedHeight = '100%',
  maxheight: fixedMaxHeight = '300px',
  fill = false,
  onContentLoaded,
  focusStartKey,
}: ContentEditorProps) => {
  const height = fill ? '100%' : fixedHeight;
  const maxheight = fill ? 'none' : fixedMaxHeight;
  const userSettings = useAtomValue(userSettingsAtom);
  const { show_insert_table_button = false, default_editor_tab = 'richtext' } =
    userSettings?.compose ?? {};

  const [mode, setMode] = useState<EditorMode>(default_editor_tab);
  // Local HTML string for code mode — kept in sync with value
  const [htmlCode, setHtmlCode] = useState(value || '');
  const lastKnownValue = useRef<string | null>(null);
  const pendingSync = useRef<{ timer?: ReturnType<typeof setTimeout>; isPending: boolean }>({
    isPending: false,
  });
  const syncToParentRef = useRef<() => void>(() => {});
  const syncToParent = useCallback(() => syncToParentRef.current(), []);

  const editor: Editor | null = useEditor({
    extensions: createEditorExtensions(),
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
      clearTimeout(pendingSync.current.timer);
      // A long quoted thread is slow to serialize: not on every keystroke
      if (editor.state.doc.content.size > LARGE_DOCUMENT_SIZE) {
        pendingSync.current.timer = setTimeout(syncToParent, TYPING_PAUSE_MS);
        pendingSync.current.isPending = true;
      } else {
        syncToParent();
      }
    },
    // Clicking Send takes the focus away first, so it always sees the latest text
    onBlur: () => {
      if (pendingSync.current.isPending) syncToParent();
    },
  });

  syncToParentRef.current = () => {
    clearTimeout(pendingSync.current.timer);
    pendingSync.current.isPending = false;
    if (!editor) return;
    const html = editor.getHTML();
    lastKnownValue.current = html;
    setHtmlCode(html);
    onChange({ html, text: editor.getText() });
  };

  // Text still waiting when the composer closes isn't lost
  useEffect(
    () => () => {
      if (pendingSync.current.isPending) syncToParent();
    },
    [syncToParent]
  );

  // A value the editor already has needs no work: what was just typed coming back
  // (comparing it to the document would serialize a long quote again on every
  // keystroke), or the same value again (StrictMode runs effects twice). Loading it
  // again would also move the cursor to the end: the editor rewrites most email
  // html, so the value never equals what the editor reports.
  const reportContentLoaded = useRef(onContentLoaded);
  reportContentLoaded.current = onContentLoaded;
  useEffect(() => {
    if (!editor || value === lastKnownValue.current) return;
    // New content from outside replaces what was waiting to sync
    clearTimeout(pendingSync.current.timer);
    pendingSync.current.isPending = false;
    if (value !== editor.getHTML()) {
      editor.commands.setContent(value);
      if (mode !== 'code') {
        // ← add this guard
        setHtmlCode(value || '');
      }
    }
    lastKnownValue.current = value;
    reportContentLoaded.current?.(editor.getHTML());
  }, [editor, value, mode]);

  const focusedForKey = useRef<string | undefined>(undefined);
  const stopHoldingFocus = useRef<() => void>(() => {});
  useEffect(() => {
    if (!editor || !focusStartKey || !value || mode !== 'richtext') return;
    if (focusedForKey.current === focusStartKey) return;
    focusedForKey.current = focusStartKey;
    stopHoldingFocus.current();

    // The first line must be in view, or the cursor blinks where nobody can see it.
    // No scrollIntoView: on an empty first line it can scroll the wrong way.
    const showFirstLine = () => {
      if (!editor.isDestroyed) (editor.view.dom as HTMLElement).scrollTop = 0;
    };
    const focusFirstLine = () => {
      if (editor.isDestroyed) return;
      editor.commands.focus('start', { scrollIntoView: false });
      showFirstLine();
    };
    focusFirstLine();
    // The focus itself happens in the next frame
    const frame = requestAnimationFrame(() => requestAnimationFrame(showFirstLine));

    // Whatever opened the composer may still take the focus: a closing menu keeps it
    // trapped during its animation, then returns it to its button. Take it back,
    // until the user does something themselves.
    const timers = FOCUS_RECHECK_MS.map((ms) =>
      setTimeout(() => {
        if (editor.isDestroyed) return;
        if (editor.isFocused) showFirstLine();
        else focusFirstLine();
      }, ms)
    );
    const stop = () => {
      cancelAnimationFrame(frame);
      timers.forEach(clearTimeout);
      USER_FOCUS_EVENTS.forEach((type) => window.removeEventListener(type, stop, true));
    };
    USER_FOCUS_EVENTS.forEach((type) => window.addEventListener(type, stop, true));
    stopHoldingFocus.current = stop;
  }, [editor, value, mode, focusStartKey]);

  useEffect(
    () => () => {
      stopHoldingFocus.current();
      // Effects running again (StrictMode) place the cursor again
      focusedForKey.current = undefined;
    },
    []
  );

  // Server spelling & grammar check (on demand — it can take a few seconds)
  const grammar = useGrammarCheck(editor);

  // When switching TO richtext from code, apply the edited HTML back into the editor
  const handleModeSwitch = (newMode: EditorMode) => {
    // Check results point into the rich-text document, which code mode replaces
    if (newMode !== 'richtext') grammar.clear();
    // Text still waiting to sync isn't in `value` yet
    const hadPending = pendingSync.current.isPending;
    if (hadPending) syncToParent();
    const currentHtml = hadPending ? (lastKnownValue.current ?? value) : value;
    if (newMode === 'richtext' && mode === 'code' && editor) {
      editor.commands.setContent(htmlCode);
      onChange({ html: htmlCode, text: editor.getText() });
    }
    if (newMode === 'code') {
      setHtmlCode(currentHtml); // ← was: editor.getHTML()
    }
    if (newMode === 'preview' && mode === 'richtext') {
      setHtmlCode(currentHtml); // ← ensure preview uses raw value, not stale htmlCode
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

  // Mode pills: Rich text / HTML / Preview, with the info tooltip
  const modeControls = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
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
            aria-label={btn.title}
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
            {/* Icons only in the composer's toolbar row, so it fits without scrolling */}
            {!fill && btn.title}
          </button>
        ))}
      </div>
    </div>
  );

  const toolbar = (
    <MenuBar
      editor={editor}
      afterFont={
        <GrammarCheckButton onClick={grammar.run} isChecking={grammar.status === 'checking'} />
      }
    />
  );

  return (
    <Flex direction="column" gap="2" className={fill ? 'h-full min-h-0' : undefined}>
      <Frame fill={fill}>
        {fill && (
          <div className="flex items-center gap-1 shrink-0 min-w-0 px-2 border-b border-[var(--gray-4)] min-h-10">
            <div className="flex-1 min-w-0">{mode === 'richtext' && toolbar}</div>
            {modeControls}
          </div>
        )}
        {!fill && (
          <div
            style={{
              position: 'absolute',
              top: 2,
              right: 2,
              zIndex: 20,
            }}
          >
            {modeControls}
          </div>
        )}

        {/* ── rich text ── */}
        {mode === 'richtext' && (
          <>
            {/* Spelling results float over the text instead of taking layout space */}
            {/* overflow: clip (not just hidden): scrollIntoView can still scroll an
                overflow-hidden box, which would shift the docked panel out of place */}
            <div
              className={`relative overflow-hidden ${fill ? 'flex-1 min-h-0' : ''}`}
              style={{ overflow: 'clip' }}
              onScroll={(e) => {
                // Fallback for browsers without overflow: clip
                e.currentTarget.scrollTop = 0;
                e.currentTarget.scrollLeft = 0;
              }}
            >
              <EditorContent editor={editor} style={fill ? { height: '100%' } : undefined} />
              <GrammarPanel check={grammar} />
            </div>
            {!fill && toolbar}
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
              flex: fill ? 1 : undefined,
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
              flex: fill ? 1 : undefined,
              minHeight: 150,
              maxHeight: maxheight,
              border: 'none',
              display: 'block',
            }}
            sandbox="allow-same-origin"
            title="Email Preview"
          />
        )}
      </Frame>
      <style>
        {`.grammar-issue {
  text-decoration-line: underline;
  text-decoration-style: wavy;
  text-decoration-thickness: 1px;
  text-underline-offset: 3px;
  cursor: pointer;
}
.grammar-issue--spelling { text-decoration-color: var(--red-9); }
.grammar-issue--grammar { text-decoration-color: var(--blue-9); }
.editor-content {
  padding: 0.75rem;
  height: ${height};
  min-height: 150px;
  max-height: ${maxheight};
  width: 100%;
  overflow-y: auto;
  box-sizing: border-box;
  outline: none;
}
.editor-content {
  /* Room under the text while the spelling panel is open (set by GrammarPanel) */
  padding-bottom: calc(0.75rem + var(--grammar-panel-space, 0px));
  transition: padding-bottom 0.3s ease-out;
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

/* Wide tables (e.g. pasted from Excel) scroll instead of squeezing every column */
.editor-content .tableWrapper {
  overflow-x: auto;
  max-width: 100%;
}

.editor-content table {
  border-collapse: collapse;
  margin: 12px 0;
  width: 100%;
  table-layout: auto;
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
