'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import { useEffect } from 'react';

// Toolbar Button Component
const ToolbarButton = ({ onClick, isActive, disabled, title, children, style = {} }) => (
    <button
        onClick={onClick}
        disabled={disabled}
        title={title}
        style={{
            width: '32px',
            height: '32px',
            border: 'none',
            background: isActive ? '#f1f5f9' : 'transparent',
            borderRadius: '6px',
            cursor: disabled ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: isActive ? '#1B365D' : '#475569',
            opacity: disabled ? 0.5 : 1,
            transition: 'all 0.15s',
            ...style,
        }}
    >
        {children}
    </button>
);

// Rich Text Editor Component
export default function RichTextEditor({
    content = '',
    onChange,
    placeholder = 'Write your message here...',
    onGenerateIntro,
    onGenerateStats,
    onGenerateCTA,
    isGenerating = false,
}) {
    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: {
                    levels: [1, 2, 3],
                },
            }),
            Placeholder.configure({
                placeholder,
            }),
            Link.configure({
                openOnClick: false,
                HTMLAttributes: {
                    class: 'text-blue-600 underline',
                },
            }),
            Underline,
        ],
        content,
        immediatelyRender: false, // Prevents SSR hydration mismatch
        onUpdate: ({ editor }) => {
            onChange?.(editor.getHTML());
        },
        editorProps: {
            attributes: {
                style: 'outline: none; min-height: 280px; padding: 20px 24px; font-size: 0.9375rem; line-height: 1.8;',
            },
        },
    });

    // Update content when prop changes (for template insertion)
    useEffect(() => {
        if (editor && content !== editor.getHTML()) {
            editor.commands.setContent(content);
        }
    }, [content, editor]);

    const addLink = () => {
        const url = window.prompt('Enter URL:');
        if (url) {
            editor?.chain().focus().setLink({ href: url }).run();
        }
    };

    if (!editor) {
        return null;
    }

    return (
        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            {/* Toolbar */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '2px',
                padding: '10px 16px',
                borderBottom: '1px solid #e2e8f0',
                background: '#fafafa',
            }}>
                {/* Text Formatting */}
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    isActive={editor.isActive('bold')}
                    title="Bold (Ctrl+B)"
                >
                    <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>B</span>
                </ToolbarButton>

                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    isActive={editor.isActive('italic')}
                    title="Italic (Ctrl+I)"
                >
                    <span style={{ fontStyle: 'italic', fontSize: '0.875rem' }}>I</span>
                </ToolbarButton>

                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleUnderline().run()}
                    isActive={editor.isActive('underline')}
                    title="Underline (Ctrl+U)"
                >
                    <span style={{ textDecoration: 'underline', fontSize: '0.875rem' }}>U</span>
                </ToolbarButton>

                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleStrike().run()}
                    isActive={editor.isActive('strike')}
                    title="Strikethrough"
                >
                    <span style={{ textDecoration: 'line-through', fontSize: '0.875rem' }}>S</span>
                </ToolbarButton>

                <div style={{ width: '1px', height: '20px', background: '#e2e8f0', margin: '0 8px' }} />

                {/* Lists */}
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    isActive={editor.isActive('bulletList')}
                    title="Bullet List"
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="8" y1="6" x2="21" y2="6" />
                        <line x1="8" y1="12" x2="21" y2="12" />
                        <line x1="8" y1="18" x2="21" y2="18" />
                        <circle cx="4" cy="6" r="1" fill="currentColor" />
                        <circle cx="4" cy="12" r="1" fill="currentColor" />
                        <circle cx="4" cy="18" r="1" fill="currentColor" />
                    </svg>
                </ToolbarButton>

                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    isActive={editor.isActive('orderedList')}
                    title="Numbered List"
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="10" y1="6" x2="21" y2="6" />
                        <line x1="10" y1="12" x2="21" y2="12" />
                        <line x1="10" y1="18" x2="21" y2="18" />
                        <text x="3" y="8" fontSize="8" fill="currentColor" stroke="none">1</text>
                        <text x="3" y="14" fontSize="8" fill="currentColor" stroke="none">2</text>
                        <text x="3" y="20" fontSize="8" fill="currentColor" stroke="none">3</text>
                    </svg>
                </ToolbarButton>

                <div style={{ width: '1px', height: '20px', background: '#e2e8f0', margin: '0 8px' }} />

                {/* Link */}
                <ToolbarButton
                    onClick={addLink}
                    isActive={editor.isActive('link')}
                    title="Insert Link (Ctrl+K)"
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
                        <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
                    </svg>
                </ToolbarButton>

                {editor.isActive('link') && (
                    <ToolbarButton
                        onClick={() => editor.chain().focus().unsetLink().run()}
                        title="Remove Link"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18.84 12.25l1.72-1.71h-.02a5.004 5.004 0 00-.12-7.07 5.006 5.006 0 00-6.95 0l-1.72 1.71" />
                            <path d="M5.17 11.75l-1.71 1.71a5.004 5.004 0 00.12 7.07 5.006 5.006 0 006.95 0l1.71-1.71" />
                            <line x1="2" y1="2" x2="22" y2="22" />
                        </svg>
                    </ToolbarButton>
                )}

                <div style={{ width: '1px', height: '20px', background: '#e2e8f0', margin: '0 8px' }} />

                {/* Block Quote */}
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleBlockquote().run()}
                    isActive={editor.isActive('blockquote')}
                    title="Quote"
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V21" />
                        <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3" />
                    </svg>
                </ToolbarButton>

                {/* Undo/Redo */}
                <ToolbarButton
                    onClick={() => editor.chain().focus().undo().run()}
                    disabled={!editor.can().undo()}
                    title="Undo (Ctrl+Z)"
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 7v6h6" />
                        <path d="M21 17a9 9 0 00-9-9 9 9 0 00-6 2.3L3 13" />
                    </svg>
                </ToolbarButton>

                <ToolbarButton
                    onClick={() => editor.chain().focus().redo().run()}
                    disabled={!editor.can().redo()}
                    title="Redo (Ctrl+Shift+Z)"
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 7v6h-6" />
                        <path d="M3 17a9 9 0 019-9 9 9 0 016 2.3l3 2.7" />
                    </svg>
                </ToolbarButton>

                {/* AI Assist Buttons */}
                {(onGenerateIntro || onGenerateStats || onGenerateCTA) && (
                    <>
                        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 500 }}>AI ASSIST:</span>

                            {onGenerateIntro && (
                                <button
                                    onClick={onGenerateIntro}
                                    disabled={isGenerating}
                                    title="Generate a personalized opening"
                                    style={{
                                        padding: '6px 12px',
                                        background: isGenerating ? '#f1f5f9' : 'linear-gradient(135deg, #fef3c7 0%, #fef9c3 100%)',
                                        border: '1px solid #fcd34d',
                                        borderRadius: '6px',
                                        fontSize: '0.75rem',
                                        fontWeight: 500,
                                        color: isGenerating ? '#94a3b8' : '#92400e',
                                        cursor: isGenerating ? 'not-allowed' : 'pointer',
                                        opacity: isGenerating ? 0.6 : 1,
                                    }}
                                >
                                    ✨ Intro
                                </button>
                            )}

                            {onGenerateStats && (
                                <button
                                    onClick={onGenerateStats}
                                    disabled={isGenerating}
                                    title="Add relevant statistics"
                                    style={{
                                        padding: '6px 12px',
                                        background: isGenerating ? '#f1f5f9' : 'linear-gradient(135deg, #fef3c7 0%, #fef9c3 100%)',
                                        border: '1px solid #fcd34d',
                                        borderRadius: '6px',
                                        fontSize: '0.75rem',
                                        fontWeight: 500,
                                        color: isGenerating ? '#94a3b8' : '#92400e',
                                        cursor: isGenerating ? 'not-allowed' : 'pointer',
                                        opacity: isGenerating ? 0.6 : 1,
                                    }}
                                >
                                    📊 Stats
                                </button>
                            )}

                            {onGenerateCTA && (
                                <button
                                    onClick={onGenerateCTA}
                                    disabled={isGenerating}
                                    title="Generate call to action"
                                    style={{
                                        padding: '6px 12px',
                                        background: isGenerating ? '#f1f5f9' : 'linear-gradient(135deg, #fef3c7 0%, #fef9c3 100%)',
                                        border: '1px solid #fcd34d',
                                        borderRadius: '6px',
                                        fontSize: '0.75rem',
                                        fontWeight: 500,
                                        color: isGenerating ? '#94a3b8' : '#92400e',
                                        cursor: isGenerating ? 'not-allowed' : 'pointer',
                                        opacity: isGenerating ? 0.6 : 1,
                                    }}
                                >
                                    🎯 CTA
                                </button>
                            )}
                        </div>
                    </>
                )}
            </div>

            {/* Editor Content */}
            <EditorContent editor={editor} />

            {/* Editor Styles */}
            <style jsx global>{`
                .ProseMirror {
                    min-height: 280px;
                    padding: 20px 24px;
                    font-size: 0.9375rem;
                    line-height: 1.8;
                    font-family: inherit;
                }
                .ProseMirror:focus {
                    outline: none;
                }
                .ProseMirror p.is-editor-empty:first-child::before {
                    content: attr(data-placeholder);
                    float: left;
                    color: #94a3b8;
                    pointer-events: none;
                    height: 0;
                }
                .ProseMirror ul, .ProseMirror ol {
                    padding-left: 1.5em;
                    margin: 0.5em 0;
                }
                .ProseMirror li {
                    margin: 0.25em 0;
                }
                .ProseMirror blockquote {
                    border-left: 3px solid #C9A227;
                    padding-left: 1em;
                    margin-left: 0;
                    color: #64748b;
                    font-style: italic;
                }
                .ProseMirror a {
                    color: #3B82F6;
                    text-decoration: underline;
                }
                .ProseMirror strong {
                    font-weight: 600;
                }
            `}</style>
        </div>
    );
}
