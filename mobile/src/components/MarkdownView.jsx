import React from 'react';
import { View, Text, StyleSheet, ScrollView, Linking, Platform } from 'react-native';

/**
 * Universal Inline Markdown Tokenizer
 * Parses: ***bold italic***, **bold**, *italic*, `code`, [link](url), and plain text.
 */
function parseInlineTokens(str) {
  if (!str) return [];
  const tokens = [];
  const regex = /(\*\*\*[^*]+\*\*\*|\*\*[^*]+\*\*|`[^`]+`|\*[^*\n]+?\*|\[[^\]]+\]\([^)]+\))/g;
  let lastIdx = 0;
  let match;

  while ((match = regex.exec(str)) !== null) {
    if (match.index > lastIdx) {
      tokens.push({ type: 'text', text: str.slice(lastIdx, match.index) });
    }
    const m = match[0];
    if (m.startsWith('***') && m.endsWith('***')) {
      tokens.push({ type: 'bold_italic', text: m.slice(3, -3) });
    } else if (m.startsWith('**') && m.endsWith('**')) {
      tokens.push({ type: 'bold', text: m.slice(2, -2) });
    } else if (m.startsWith('*') && m.endsWith('*')) {
      tokens.push({ type: 'italic', text: m.slice(1, -1) });
    } else if (m.startsWith('`') && m.endsWith('`')) {
      tokens.push({ type: 'code', text: m.slice(1, -1) });
    } else if (m.startsWith('[')) {
      const parts = m.match(/\[(.*?)\]\((.*?)\)/);
      if (parts) {
        tokens.push({ type: 'link', text: parts[1], url: parts[2] });
      } else {
        tokens.push({ type: 'text', text: m });
      }
    }
    lastIdx = regex.lastIndex;
  }

  if (lastIdx < str.length) {
    tokens.push({ type: 'text', text: str.slice(lastIdx) });
  }

  return tokens;
}

/**
 * Parse Markdown Blocks:
 * Handles code fences, headers (#, ##, ###), bullet lists (•, -, *),
 * numbered lists (1.), quotes (>), horizontal dividers (---), and regular paragraphs.
 */
function parseMarkdownBlocks(rawText) {
  if (!rawText || typeof rawText !== 'string') return [];
  const lines = rawText.split('\n');
  const blocks = [];
  let currentParagraph = [];
  let inCodeBlock = false;
  let codeBlockLines = [];

  const flushParagraph = () => {
    if (currentParagraph.length > 0) {
      blocks.push({
        type: 'paragraph',
        text: currentParagraph.join('\n'),
      });
      currentParagraph = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Code block fences (``` or ```lang)
    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
        blocks.push({ type: 'code_block', code: codeBlockLines.join('\n') });
        codeBlockLines = [];
        inCodeBlock = false;
      } else {
        flushParagraph();
        inCodeBlock = true;
        codeBlockLines = [];
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockLines.push(line);
      continue;
    }

    // Blank line -> Paragraph separator
    if (!trimmed) {
      flushParagraph();
      continue;
    }

    // Horizontal Rule: --- or *** or ___
    if (/^(\-\-\-|\*\*\*|___)$/.test(trimmed)) {
      flushParagraph();
      blocks.push({ type: 'divider' });
      continue;
    }

    // Heading 1: # Title
    if (/^#\s+(.+)$/.test(trimmed)) {
      flushParagraph();
      blocks.push({ type: 'h1', text: trimmed.replace(/^#\s+/, '') });
      continue;
    }

    // Heading 2: ## Title
    if (/^##\s+(.+)$/.test(trimmed)) {
      flushParagraph();
      blocks.push({ type: 'h2', text: trimmed.replace(/^##\s+/, '') });
      continue;
    }

    // Heading 3: ### Title
    if (/^###\s+(.+)$/.test(trimmed)) {
      flushParagraph();
      blocks.push({ type: 'h3', text: trimmed.replace(/^###\s+/, '') });
      continue;
    }

    // Blockquote: > Quote
    if (/^>\s*(.+)$/.test(trimmed)) {
      flushParagraph();
      blocks.push({ type: 'quote', text: trimmed.replace(/^>\s*/, '') });
      continue;
    }

    // Bullet points: •, -, or * (when not bold)
    const bulletMatch = trimmed.match(/^([•\-\*])\s+(.+)$/);
    if (bulletMatch) {
      flushParagraph();
      blocks.push({ type: 'bullet', text: bulletMatch[2] });
      continue;
    }

    // Numbered lists: 1. Item, 2) Item
    const numMatch = trimmed.match(/^(\d+)[\.\)]\s+(.+)$/);
    if (numMatch) {
      flushParagraph();
      blocks.push({ type: 'numbered', number: numMatch[1], text: numMatch[2] });
      continue;
    }

    // Normal paragraph text line
    currentParagraph.push(line);
  }

  flushParagraph();
  if (inCodeBlock && codeBlockLines.length > 0) {
    blocks.push({ type: 'code_block', code: codeBlockLines.join('\n') });
  }

  return blocks;
}

/**
 * Render inline tokens as nested Text elements
 */
function renderInlineTokens(tokens, baseStyle, isUser) {
  return tokens.map((token, idx) => {
    switch (token.type) {
      case 'bold':
        return (
          <Text
            key={idx}
            style={[
              baseStyle,
              styles.boldText,
              isUser && styles.userBoldText,
            ]}
          >
            {token.text}
          </Text>
        );

      case 'italic':
        return (
          <Text
            key={idx}
            style={[
              baseStyle,
              styles.italicText,
              isUser && styles.userItalicText,
            ]}
          >
            {token.text}
          </Text>
        );

      case 'bold_italic':
        return (
          <Text
            key={idx}
            style={[
              baseStyle,
              styles.boldItalicText,
              isUser && styles.userBoldText,
            ]}
          >
            {token.text}
          </Text>
        );

      case 'code':
        return (
          <Text
            key={idx}
            style={[
              styles.inlineCode,
              isUser ? styles.inlineCodeUser : styles.inlineCodeAi,
            ]}
          >
            {` ${token.text} `}
          </Text>
        );

      case 'link':
        return (
          <Text
            key={idx}
            style={[
              baseStyle,
              styles.linkText,
              isUser && styles.userLinkText,
            ]}
            onPress={() => {
              if (token.url) {
                Linking.openURL(token.url).catch(() => {});
              }
            }}
          >
            {token.text}
          </Text>
        );

      default:
        return (
          <Text key={idx} style={baseStyle}>
            {token.text}
          </Text>
        );
    }
  });
}

/**
 * MarkdownView Component
 * Renders structured markdown content with support for bold, italic,
 * headings, bullet points, numbered lists, blockquotes, code blocks, and links.
 */
export default function MarkdownView({ content, baseStyle, isUser = false }) {
  if (!content) return null;

  const blocks = parseMarkdownBlocks(content);

  return (
    <View style={styles.container}>
      {blocks.map((block, idx) => {
        const isLast = idx === blocks.length - 1;
        const blockMargin = isLast ? 0 : 5;

        switch (block.type) {
          case 'h1': {
            const tokens = parseInlineTokens(block.text);
            return (
              <View key={idx} style={{ marginBottom: blockMargin + 2, marginTop: idx > 0 ? 6 : 0 }}>
                <Text style={[styles.h1Text, isUser && styles.userHeaderText]}>
                  {renderInlineTokens(tokens, styles.h1Text, isUser)}
                </Text>
              </View>
            );
          }

          case 'h2': {
            const tokens = parseInlineTokens(block.text);
            return (
              <View key={idx} style={{ marginBottom: blockMargin + 1, marginTop: idx > 0 ? 5 : 0 }}>
                <Text style={[styles.h2Text, isUser && styles.userHeaderText]}>
                  {renderInlineTokens(tokens, styles.h2Text, isUser)}
                </Text>
              </View>
            );
          }

          case 'h3': {
            const tokens = parseInlineTokens(block.text);
            return (
              <View key={idx} style={{ marginBottom: blockMargin, marginTop: idx > 0 ? 4 : 0 }}>
                <Text style={[styles.h3Text, isUser && styles.userHeaderText]}>
                  {renderInlineTokens(tokens, styles.h3Text, isUser)}
                </Text>
              </View>
            );
          }

          case 'bullet': {
            const tokens = parseInlineTokens(block.text);
            return (
              <View key={idx} style={[styles.bulletRow, { marginBottom: blockMargin }]}>
                <View style={[styles.bulletDot, isUser && styles.bulletDotUser]} />
                <Text style={[styles.bulletContent, baseStyle]}>
                  {renderInlineTokens(tokens, baseStyle, isUser)}
                </Text>
              </View>
            );
          }

          case 'numbered': {
            const tokens = parseInlineTokens(block.text);
            return (
              <View key={idx} style={[styles.numberedRow, { marginBottom: blockMargin }]}>
                <Text style={[styles.numberedPrefix, isUser && styles.numberedPrefixUser]}>
                  {block.number}.{' '}
                </Text>
                <Text style={[styles.numberedContent, baseStyle]}>
                  {renderInlineTokens(tokens, baseStyle, isUser)}
                </Text>
              </View>
            );
          }

          case 'quote': {
            const tokens = parseInlineTokens(block.text);
            return (
              <View
                key={idx}
                style={[
                  styles.quoteBox,
                  isUser ? styles.quoteBoxUser : styles.quoteBoxAi,
                  { marginBottom: blockMargin + 2 },
                ]}
              >
                <Text style={[styles.quoteText, isUser && styles.quoteTextUser]}>
                  {renderInlineTokens(tokens, styles.quoteText, isUser)}
                </Text>
              </View>
            );
          }

          case 'code_block': {
            return (
              <View key={idx} style={[styles.codeBlockCard, { marginBottom: blockMargin + 2 }]}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <Text style={styles.codeBlockText}>{block.code}</Text>
                </ScrollView>
              </View>
            );
          }

          case 'divider': {
            return (
              <View
                key={idx}
                style={[
                  styles.divider,
                  isUser ? styles.dividerUser : styles.dividerAi,
                  { marginVertical: 6 },
                ]}
              />
            );
          }

          case 'paragraph':
          default: {
            const tokens = parseInlineTokens(block.text);
            return (
              <View key={idx} style={{ marginBottom: blockMargin }}>
                <Text style={[styles.paragraphText, baseStyle]}>
                  {renderInlineTokens(tokens, baseStyle, isUser)}
                </Text>
              </View>
            );
          }
        }
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  paragraphText: {
    lineHeight: 21,
  },
  boldText: {
    fontWeight: '700',
    color: '#0F172A',
  },
  userBoldText: {
    fontWeight: '700',
    color: '#FFFFFF',
  },
  italicText: {
    fontStyle: 'italic',
    color: '#334155',
  },
  userItalicText: {
    fontStyle: 'italic',
    color: '#F1F5F9',
  },
  boldItalicText: {
    fontWeight: '700',
    fontStyle: 'italic',
    color: '#0F172A',
  },
  inlineCode: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12.5,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  inlineCodeAi: {
    backgroundColor: '#F1F5F9',
    color: '#0F766E',
    fontWeight: '600',
  },
  inlineCodeUser: {
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    color: '#FFFFFF',
    fontWeight: '600',
  },
  linkText: {
    color: '#0284C7',
    textDecorationLine: 'underline',
  },
  userLinkText: {
    color: '#BAE6FD',
    textDecorationLine: 'underline',
  },
  h1Text: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 23,
  },
  h2Text: {
    fontSize: 15.5,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 22,
  },
  h3Text: {
    fontSize: 14.5,
    fontWeight: '600',
    color: '#1E293B',
    lineHeight: 20,
  },
  userHeaderText: {
    color: '#FFFFFF',
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingLeft: 2,
  },
  bulletDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#059669',
    marginTop: 7,
    marginRight: 8,
  },
  bulletDotUser: {
    backgroundColor: '#FFFFFF',
  },
  bulletContent: {
    flex: 1,
    lineHeight: 20,
  },
  numberedRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingLeft: 2,
  },
  numberedPrefix: {
    fontWeight: '700',
    color: '#059669',
    marginRight: 4,
    lineHeight: 20,
  },
  numberedPrefixUser: {
    color: '#FFFFFF',
  },
  numberedContent: {
    flex: 1,
    lineHeight: 20,
  },
  quoteBox: {
    borderLeftWidth: 3.5,
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  quoteBoxAi: {
    borderLeftColor: '#059669',
    backgroundColor: '#F0FDF4',
  },
  quoteBoxUser: {
    borderLeftColor: '#FFFFFF',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  quoteText: {
    fontSize: 13,
    color: '#1E293B',
    fontStyle: 'italic',
    lineHeight: 19,
  },
  quoteTextUser: {
    color: '#FFFFFF',
  },
  codeBlockCard: {
    backgroundColor: '#0F172A',
    borderRadius: 8,
    padding: 10,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: '#334155',
  },
  codeBlockText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
    color: '#38BDF8',
    lineHeight: 18,
  },
  divider: {
    height: 1,
    width: '100%',
  },
  dividerAi: {
    backgroundColor: '#E2E8F0',
  },
  dividerUser: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
});
