/**
 * Turn markdown links [label](url) into real <a> tags.
 * Leaves placeholders like [Job Title] alone (no URL paren).
 * Skips image syntax ![alt](src).
 */
function hydrateMarkdownLinks(text) {
  if (!text) return text;
  return text.replace(
    /(^|[^!])\[([^\]]+)\]\(([^)\s]+)\)/g,
    (_, prefix, label, url) => {
      const cleanLabel = String(label)
        .replace(/%%HTMLBLOCK\d+%%/g, '')
        .replace(/<[^>]+>/g, '')
        .trim();
      const display = cleanLabel || 'link';
      return `${prefix}<a href="${url}" target="_blank" rel="noopener noreferrer">${display}</a>`;
    }
  );
}

/**
 * Unwrap markdown that was incorrectly trapped inside TipTap <p> tags
 * (e.g. <p>### Title</p>) so it can be converted to real headings/lists.
 * Also normalizes empty spacer paragraphs.
 */
function liberateMarkdownFromParagraphs(input) {
  return input
    // <p>### Heading</p> → ### Heading
    .replace(
      /<p(?:\s[^>]*)?>\s*(#{1,6}\s+[\s\S]*?)\s*<\/p>/gi,
      (_, md) => `\n\n${md.trim()}\n\n`
    )
    // <p>1. **Clause**</p> → plain markdown line
    .replace(
      /<p(?:\s[^>]*)?>\s*(\d+\.\s+\*\*[^*]+?\*\*)\s*<\/p>/gi,
      (_, md) => `\n\n${md.trim()}\n\n`
    )
    // Keep intentional blank lines TipTap stores as empty / <br> paragraphs
    .replace(/<p(?:\s[^>]*)?>\s*(?:<br\s*\/?>|&nbsp;|\u00a0)?\s*<\/p>/gi, '\n\n%%SPACER%%\n\n');
}

/**
 * Converts Markdown text to HTML for TipTap.
 * Preserves embedded HTML spans/styles produced by the editor (colors, fonts, etc.).
 */
export function markdownToHtml(markdown) {
  if (!markdown) return '';

  let html = markdown.replace(/\r\n/g, '\n');
  html = liberateMarkdownFromParagraphs(html);
  // Convert links before parking HTML so [text](url) inside <p style=...> becomes a real <a>
  html = hydrateMarkdownLinks(html);

  const trimmed = html.trim();

  // Pure TipTap HTML with no markdown syntax — pass through (keep spacers)
  const hasMdSyntax =
    /^(#{1,6}\s|[-*]\s|\d+\.\s|>\s|%%SPACER%%)/m.test(html) ||
    /(\*\*|__|~~|`)/.test(html) ||
    /!\[[^\]]*\]\([^)]+\)/.test(html);

  if (!hasMdSyntax && /^<(p|h[1-6]|ul|ol|blockquote|table|pre|div|hr|a)\b/i.test(trimmed)) {
    let clean = html
      .replace(/%%SPACER%%/g, '<p><br></p>')
      .replace(/\[\s*%%HTMLBLOCK\d+%%\s*\]\(([^)]+)\)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">link</a>')
      .replace(/%%HTMLBLOCK\d+%%/g, '');
    clean = hydrateMarkdownLinks(clean);
    // Empty/broken link labels → "link"
    clean = clean.replace(
      /<a\b([^>]*)>(\s*)<\/a>/gi,
      '<a$1>link</a>'
    );
    return clean;
  }

  // 1. Blockquotes - Group consecutive blockquote lines and wrap in a single blockquote
  html = html.replace(/(?:^[ \t]*>.*(?:\n|$))+/gm, (block) => {
    const innerMarkdown = block
      .split('\n')
      .map((line) => line.replace(/^[ \t]*>[ \t]?/, ''))
      .join('\n');
    return `<blockquote>${markdownToHtml(innerMarkdown)}</blockquote>`;
  });

  // Protect existing HTML blocks so markdown rules don't break them
  const htmlBlocks = [];
  const park = (chunk) => {
    const i = htmlBlocks.length;
    htmlBlocks.push(chunk);
    // Inline placeholder (no newlines) — newlines were breaking [label](url) into [%%HTMLBLOCKn%%](url)
    return `%%HTMLBLOCK${i}%%`;
  };

  // Park fenced code first (handles single-line and multiline code blocks)
  html = html.replace(/```([\s\S]*?)```/g, (match, inner) => {
    const newlineIdx = inner.indexOf('\n');
    let lang = '';
    let content = '';
    if (newlineIdx !== -1) {
      lang = inner.substring(0, newlineIdx).trim();
      content = inner.substring(newlineIdx + 1).replace(/\n$/, '');
    } else {
      content = inner.trim();
    }
    return park(`<pre><code class="language-${lang}">${content}</code></pre>`);
  });

  // Park block-level HTML only. Never park inline <a>/<span> — that caused
  // broken links like [%%HTMLBLOCK2%%](https://...) in TipTap.
  html = html.replace(
    /<(h[1-6]|ul|ol|blockquote|table|pre|div)(\s[^>]*)?>[\s\S]*?<\/\1>/gi,
    (m) => park(m)
  );
  // Park <p> only when it has style / data attrs
  html = html.replace(/<p(\s[^>]+)>[\s\S]*?<\/p>/gi, (m) => park(m));
  html = html.replace(/<(img|hr)(\s[^>]*)?\s*\/?>/gi, (m) => park(m));

  // 1. Tables
  const linesForTable = html.split('\n');
  let inTable = false;
  let tableHeaders = [];
  let tableRows = [];
  let alignment = [];
  const finalLinesAfterTable = [];

  for (let i = 0; i < linesForTable.length; i++) {
    const line = linesForTable[i].trim();

    if (line.startsWith('|') && line.endsWith('|') && !line.includes('%%HTMLBLOCK')) {
      const cells = line.split('|').map((c) => c.trim()).slice(1, -1);

      if (!inTable) {
        inTable = true;
        tableHeaders = cells;
      } else if (line.match(/^\|[\s:-|]+$/)) {
        alignment = cells.map((cell) => {
          if (cell.startsWith(':') && cell.endsWith(':')) return 'center';
          if (cell.endsWith(':')) return 'right';
          return 'left';
        });
      } else {
        tableRows.push(cells);
      }
    } else {
      if (inTable) {
        finalLinesAfterTable.push(renderTable(tableHeaders, tableRows, alignment));
        inTable = false;
        tableHeaders = [];
        tableRows = [];
        alignment = [];
      }
      finalLinesAfterTable.push(linesForTable[i]);
    }
  }

  if (inTable) {
    finalLinesAfterTable.push(renderTable(tableHeaders, tableRows, alignment));
  }

  html = finalLinesAfterTable.join('\n');

  // Fenced code already handled and parked early

  // Headings
  html = html.replace(/^(#{1,6})\s+(?:\{([^}]*)\}\s*)?(.*?)$/gm, (_, hashes, attrs, text) => {
    const level = hashes.length;
    const attrStr = attrsToHtml(attrs);
    return `\n<h${level}${attrStr}>${text}</h${level}>\n`;
  });
  html = html.replace(/\n{3,}/g, '\n\n');

  // Blockquotes handled early

  // Horizontal rules
  html = html.replace(/^---$/gm, '<hr>');

  // Legal-doc clauses: "1. **Title**" → bold paragraph, NOT a fresh <ol> (avoids every clause showing as "1.")
  html = html.replace(
    /^(\d+)\.\s+\*\*([^*]+?)\*\*(?:\s+|<br\s*\/?>)?(.*)$/gim,
    (_, num, title, body) => {
      if (body && body.trim()) {
        return `<p><strong>${num}. ${title}</strong><br>${body.trim()}</p>`;
      }
      return `<p><strong>${num}. ${title}</strong></p>`;
    }
  );

  // Lists (bullet / numbered / task) — skip parked HTML + already-converted clauses
  const lines = html.split('\n');
  const processedLines = [];
  let currentList = null;

  const closeList = () => {
    if (!currentList) return;
    if (currentList === 'task') processedLines.push('</ul>');
    else processedLines.push(`</${currentList}>`);
    currentList = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('%%HTMLBLOCK') || /^\s*<\/?(p|h\d|ul|ol|li|blockquote|pre|table|hr)\b/i.test(line)) {
      closeList();
      processedLines.push(line);
      continue;
    }

    const taskMatch = line.match(/^[-*]\s+\[([ xX])\]\s+(.*)$/);
    const ulMatch = !taskMatch && line.match(/^[-*]\s+(.*)$/);
    // Only use ordered lists for simple items (not already turned into <p><strong>)
    const olMatch = line.match(/^(\d+)\.\s+(.*)$/);

    if (taskMatch) {
      if (currentList !== 'task') {
        closeList();
        currentList = 'task';
        processedLines.push('<ul data-type="taskList" class="task-list">');
      }
      const checked = taskMatch[1].toLowerCase() === 'x';
      processedLines.push(
        `<li data-type="taskItem" data-checked="${checked}" class="task-item"><label><input type="checkbox"${checked ? ' checked' : ''} /><span></span></label><div><p>${taskMatch[2]}</p></div></li>`
      );
    } else if (ulMatch) {
      if (currentList !== 'ul') {
        closeList();
        currentList = 'ul';
        processedLines.push('<ul>');
      }
      processedLines.push(`<li><p>${ulMatch[1]}</p></li>`);
    } else if (olMatch && !olMatch[2].startsWith('<')) {
      // Keep continuous <ol> across blank lines later handled by not closing on empty
      if (currentList !== 'ol') {
        closeList();
        currentList = 'ol';
        const startNum = parseInt(olMatch[1], 10);
        processedLines.push(startNum > 1 ? `<ol start="${startNum}">` : '<ol>');
      }
      processedLines.push(`<li><p>${olMatch[2]}</p></li>`);
    } else if (line.trim() === '' && (currentList === 'ol' || currentList === 'ul')) {
      // Keep list open across a single blank line so numbers continue
      processedLines.push(line);
    } else {
      closeList();
      processedLines.push(line);
    }
  }
  closeList();

  html = processedLines.join('\n');

  // Inline marks (avoid transforming inside parked blocks — placeholders have no **)
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__(.*?)__/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*\n]+)\*/g, '<em>$1</em>');
  html = html.replace(/~~(.*?)~~/g, '<s>$1</s>');
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  html = html.replace(/__u__(.*?)__u__/g, '<u>$1</u>');
  html = html.replace(/~([^~\s]+)~/g, '<sub>$1</sub>');
  html = html.replace(/\^([^^\s]+)\^/g, '<sup>$1</sup>');
  html = html.replace(/==([^=]+)==/g, '<mark>$1</mark>');
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" />');
  html = hydrateMarkdownLinks(html);

  // Paragraphs
  const blocks = html.split(/\n\n+/);
  const wrappedBlocks = blocks.map((block) => {
    let trimmedBlock = block.trim();
    if (!trimmedBlock) return '';

    // Intentional blank line from the editor
    if (trimmedBlock === '%%SPACER%%') {
      return '<p><br></p>';
    }

    // Keep parked HTML blocks as-is
    if (/^%%HTMLBLOCK\d+%%$/.test(trimmedBlock)) {
      return trimmedBlock;
    }

    let attrStr = '';
    const attrMatch = trimmedBlock.match(/^\{([^}]+)\}\s*\n?([\s\S]*)$/);
    if (attrMatch && !trimmedBlock.startsWith('<')) {
      attrStr = attrsToHtml(attrMatch[1]);
      trimmedBlock = attrMatch[2].trim();
    }

    // Extract any leading closing tags to prevent them from being wrapped inside <p>
    let leadingClosingTags = '';
    const closeTagsMatch = trimmedBlock.match(/^((?:<\/(?:ol|ul|li|blockquote|pre|table|thead|tbody|tr|th|td|div)>\s*)+)([\s\S]*)$/i);
    if (closeTagsMatch) {
      leadingClosingTags = closeTagsMatch[1];
      trimmedBlock = closeTagsMatch[2].trim();
    }

    if (!trimmedBlock) {
      return leadingClosingTags;
    }

    // Check if the block starts with any block-level tag (opening or closing)
    const startsWithBlockTag = /^<\/?(h[1-6]|p|div|ul|ol|li|blockquote|pre|table|thead|tbody|tr|th|td|hr|img)\b/i.test(trimmedBlock);

    if (startsWithBlockTag || trimmedBlock.includes('%%HTMLBLOCK')) {
      return leadingClosingTags + trimmedBlock;
    }

    const content = trimmedBlock.replace(/\n/g, '<br>');
    return `${leadingClosingTags}<p${attrStr}>${content}</p>`;
  });

  html = wrappedBlocks.filter(Boolean).join('');

  // Restore parked HTML + leftover spacers
  // Repair links whose label was parked: [%%HTMLBLOCK2%%](https://...)
  html = html.replace(/\[\s*%%HTMLBLOCK(\d+)%%\s*\]\(([^)]+)\)/g, (_, i, url) => {
    const block = htmlBlocks[Number(i)] || '';
    if (/^<a\b/i.test(block.trim())) return block;
    if (block.includes('<')) {
      return `<a href="${url}" target="_blank" rel="noopener noreferrer">${block}</a>`;
    }
    const label = (block || 'link').trim() || 'link';
    return `<a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`;
  });
  html = html.replace(/%%HTMLBLOCK(\d+)%%/g, (_, i) => htmlBlocks[Number(i)] || '');
  html = html.replace(/%%SPACER%%/g, '<p><br></p>');
  html = hydrateMarkdownLinks(html);
  html = html.replace(/%%HTMLBLOCK\d+%%/g, '');

  return html;
}

function renderTable(headers, rows, alignment) {
  let tableHtml = '<table>';
  if (headers.length > 0) {
    tableHtml += '<thead><tr>';
    headers.forEach((h, idx) => {
      const alignStyle = alignment[idx] ? ` style="text-align: ${alignment[idx]}"` : '';
      tableHtml += `<th${alignStyle}>${h}</th>`;
    });
    tableHtml += '</tr></thead>';
  }
  if (rows.length > 0) {
    tableHtml += '<tbody>';
    rows.forEach((row) => {
      tableHtml += '<tr>';
      row.forEach((cell, idx) => {
        const alignStyle = alignment[idx] ? ` style="text-align: ${alignment[idx]}"` : '';
        tableHtml += `<td${alignStyle}>${cell}</td>`;
      });
      tableHtml += '</tr>';
    });
    tableHtml += '</tbody>';
  }
  tableHtml += '</table>';
  return tableHtml;
}

function attrsToHtml(attrs) {
  if (!attrs) return '';
  const parts = [];
  const styles = [];
  attrs.split(/\s+/).forEach((pair) => {
    const [k, v] = pair.split('=');
    if (!k || v == null) return;
    if (k === 'align') styles.push(`text-align: ${v}`);
    else if (k === 'indent') {
      parts.push(` data-indent="${v}"`);
      styles.push(`margin-left: ${parseInt(v, 10) * 24}px`);
    }
  });
  if (styles.length) parts.push(` style="${styles.join('; ')}"`);
  return parts.join('');
}

/** Read indent/align from a TipTap node → HTML attribute string */
function blockHtmlAttrs(node) {
  const style = node.getAttribute('style') || '';
  const indentAttr = node.getAttribute('data-indent');
  const alignMatch = style.match(/text-align:\s*([^;]+)/);
  const marginMatch = style.match(/margin-left:\s*(\d+)/);
  const styles = [];
  const attrs = [];

  const indentVal = indentAttr
    ? parseInt(indentAttr, 10) || 0
    : marginMatch
      ? Math.round(parseInt(marginMatch[1], 10) / 24)
      : 0;

  if (indentVal > 0) {
    attrs.push(`data-indent="${indentVal}"`);
    styles.push(`margin-left: ${indentVal * 24}px`);
  }
  if (alignMatch) {
    const align = alignMatch[1].trim();
    if (align && align !== 'left') styles.push(`text-align: ${align}`);
  }
  if (styles.length) attrs.push(`style="${styles.join('; ')}"`);
  return attrs.length ? ` ${attrs.join(' ')}` : '';
}

/**
 * Cleans saved editor content for ReactMarkdown display:
 * - Removes legacy `{indent=N}` markers (applies real margin instead)
 * - Unwraps pointless font-family spans
 * - Ensures headings / clause titles get their own lines so bold + breaks render
 */
export function prepareTermsMarkdown(md) {
  if (!md) return '';

  let text = md
    // Normalize Windows newlines
    .replace(/\r\n/g, '\n')
    // Liberate headings trapped in <p>### Title</p>
    .replace(
      /<p(?:\s[^>]*)?>\s*(#{1,6}\s+[\s\S]*?)\s*<\/p>/gi,
      (_, heading) => `\n\n${heading.trim()}\n\n`
    )
    // Keep other styled spans but ensure they're on sane boundaries
    .replace(/<\/span>\s*</g, '</span>\n<');

  // Lines that start with {indent=2} / {align=center indent=1}
  text = text
    .split('\n')
    .map((line) => {
      const m = line.match(/^\{([^}\n]+)\}\s*(.*)$/);
      if (!m) return line;
      const htmlAttrs = attrsToHtml(m[1]);
      const rest = (m[2] || '').trim();
      if (!rest) return '';
      // Prefer bullet list when many title-case phrases were mashed into one indent block
      const maybeBullets = splitMashedPhrases(rest);
      if (maybeBullets.length > 1) {
        const indentStyle = htmlAttrs.includes('margin-left')
          ? htmlAttrs
          : ' style="margin-left: 24px"';
        return maybeBullets.map((item) => `<p${indentStyle || htmlAttrs}>• ${item}</p>`).join('\n');
      }
      return `<p${htmlAttrs}>${rest}</p>`;
    })
    .join('\n');

  text = text
    // Stray markers mid-content
    .replace(/\{(?:indent|align)=[^}\n]+\}/g, '')
    // Put a blank line after markdown headings so following text isn't stuck on same line
    .replace(/^(#{1,6}\s+.+)$/gm, '$1\n')
    // `### TITLE 1. **Clause**` → heading then clause on next lines
    .replace(/^(#{1,6}\s+[^\n]+?)[ \t]+(\d+\.\s)/gm, '$1\n\n$2')
    .replace(/^(#{1,6}\s+[^\n]+?)[ \t]+(\*\*)/gm, '$1\n\n$2')
    // Bold clause title then body on same line → title then body on next line using <br>
    .replace(/^(\*\*\d+\.\s+[^*]+?\*\*)[ \t]+(?=\S)/gm, '$1<br>')
    .replace(/^(\d+\.\s+\*\*[^*]+?\*\*)[ \t]+(?=\S)/gm, '$1<br>')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // Markdown links inside HTML <p>…</p> (ReactMarkdown won't parse them otherwise)
  let clean = hydrateMarkdownLinks(text);

  // Convert inline markdown formatting inside spans/HTML tags to HTML tags so they render correctly in rehypeRaw
  clean = clean
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.*?)__/g, '<strong>$1</strong>')
    .replace(/\*([^*\n]+)\*/g, '<em>$1</em>')
    .replace(/~~(.*?)~~/g, '<s>$1</s>')
    .replace(/__u__(.*?)__u__/g, '<u>$1</u>');

  return clean;
}

/** Split compacted Title Case phrases into separate items when possible */
function splitMashedPhrases(text) {
  if (!text || text.length < 40) return [text];
  // Only between end of a word and a new Capitalized multi-word phrase (not after commas)
  const parts = text
    .split(/(?<=[a-z0-9])\s+(?=[A-Z][a-z]+(?:\s+\S+){1,})/)
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.length > 1 ? parts : [text];
}

/** Plain text excerpt for policy list cards (no raw markdown/HTML) */
export function termsPlainExcerpt(md, maxLen = 180) {
  if (!md) return '';
  let t = prepareTermsMarkdown(md)
    .replace(/<[^>]+>/g, ' ')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*|__/g, '')
    .replace(/\*|_|~~|`/g, '')
    .replace(/!\[[^\]]*\]\([^)]+\)/g, '')
    .replace(/\[[^\]]*\]\([^)]+\)/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (t.length <= maxLen) return t;
  return `${t.slice(0, maxLen).trim()}…`;
}

/**
 * Converts TipTap HTML back to Markdown (with HTML islands for rich styles).
 */
export function htmlToMarkdown(html) {
  if (!html) return '';

  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;

  function parseNode(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.nodeValue || '';
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return '';

    const tagName = node.tagName.toLowerCase();
    const style = node.getAttribute('style') || '';
    let styleStart = '';
    let styleEnd = '';

    if (style && tagName === 'span') {
      const colorMatch = style.match(/(?:^|;)\s*color:\s*([^;]+)/);
      const bgMatch = style.match(/background-color:\s*([^;]+)/);
      const sizeMatch = style.match(/font-size:\s*([^;]+)/);
      const familyMatch = style.match(/(?:^|;)\s*font-family:\s*([^;]+)/);
      const attrs = [];
      if (colorMatch) attrs.push(`color: ${colorMatch[1].trim()}`);
      if (bgMatch) attrs.push(`background-color: ${bgMatch[1].trim()}`);
      if (sizeMatch) attrs.push(`font-size: ${sizeMatch[1].trim()}`);
      if (familyMatch) attrs.push(`font-family: ${familyMatch[1].trim()}`);
      if (attrs.length > 0) {
        styleStart = `<span style="${attrs.join('; ')}">`;
        styleEnd = '</span>';
      }
    }

    const children = Array.from(node.childNodes).map(parseNode).join('');

    switch (tagName) {
      case 'h1':
      case 'h2':
      case 'h3':
      case 'h4':
      case 'h5':
      case 'h6': {
        // Always keep headings as HTML so re-edit never shows literal ###
        const extra = blockHtmlAttrs(node);
        return `\n\n<${tagName}${extra}>${children.trim()}</${tagName}>\n\n`;
      }
      case 'p': {
        const extra = blockHtmlAttrs(node);
        const plain = children.replace(/<br\s*\/?>/gi, '').replace(/&nbsp;|\u00a0/g, '').trim();
        // Preserve blank Enter presses so spacing survives save → reload → preview
        if (!plain) {
          return `\n\n<p${extra}><br></p>\n\n`;
        }
        // If inside list item, don't generate double newlines or split the text
        const isInsideLi = node.parentNode && node.parentNode.tagName.toLowerCase() === 'li';
        if (isInsideLi) {
          const isFirstChild = Array.from(node.parentNode.childNodes).indexOf(node) === 0;
          return isFirstChild ? children : `<br>${children}`;
        }
        if (extra) {
          return `\n\n<p${extra}>${children}</p>\n\n`;
        }
        return `\n\n${children}\n\n`;
      }
      case 'span':
        return `${styleStart}${children}${styleEnd}`;
      case 'mark': {
        const bg = node.getAttribute('data-color') || node.style.backgroundColor;
        if (bg) return `<mark style="background-color: ${bg}">${children}</mark>`;
        return `==${children}==`;
      }
      case 'strong':
      case 'b':
        return `**${children}**`;
      case 'em':
      case 'i':
        return `*${children}*`;
      case 'u':
        return `<u>${children}</u>`;
      case 'del':
      case 's':
        return `~~${children}~~`;
      case 'sub':
        return `~${children}~`;
      case 'sup':
        return `^${children}^`;
      case 'blockquote': {
        const lines = children.trim().split('\n');
        const blockquoteLines = [];
        let wasEmpty = false;
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (line === '') {
            if (!wasEmpty) {
              blockquoteLines.push('>');
              wasEmpty = true;
            }
          } else {
            blockquoteLines.push(`> ${line}`);
            wasEmpty = false;
          }
        }
        return `\n\n${blockquoteLines.join('\n')}\n\n`;
      }
      case 'pre': {
        const codeElement = node.querySelector('code');
        if (codeElement) {
          const langClass = codeElement.getAttribute('class') || '';
          const lang = langClass.replace('language-', '') || '';
          return `\n\`\`\`${lang}\n${codeElement.innerText || codeElement.textContent}\n\`\`\`\n`;
        }
        return `\n\`\`\`\n${node.innerText || node.textContent}\n\`\`\`\n`;
      }
      case 'code':
        if (node.parentNode && node.parentNode.tagName.toLowerCase() === 'pre') return children;
        return `\`${children}\``;
      case 'a': {
        // Keep as HTML so re-edit shows a real TipTap link (not [text](url) / placeholders)
        const href = node.getAttribute('href') || '';
        const safeHref = href.replace(/"/g, '&quot;');
        return `<a href="${safeHref}" target="_blank" rel="noopener noreferrer">${children}</a>`;
      }
      case 'img': {
        const src = node.getAttribute('src') || '';
        const alt = node.getAttribute('alt') || '';
        return `![${alt}](${src})`;
      }
      case 'ul':
      case 'ol':
        return `\n${children}\n`;
      case 'li': {
        const parent = node.parentNode;
        const dataType = node.getAttribute('data-type');
        // Strip checkbox label UI from TipTap task items when extracting text
        let liContent = children.trim();
        if (dataType === 'taskItem' || (parent && parent.getAttribute?.('data-type') === 'taskList')) {
          const checked =
            node.getAttribute('data-checked') === 'true' ||
            !!node.querySelector?.('input[type="checkbox"]:checked');
          // TipTap often nests content in a div after the label
          const textOnly = Array.from(node.childNodes)
            .filter((n) => !(n.nodeType === 1 && (n.tagName === 'LABEL' || n.tagName === 'INPUT')))
            .map(parseNode)
            .join('')
            .trim();
          return `- [${checked ? 'x' : ' '}] ${textOnly || liContent}\n`;
        }
        if (parent && parent.tagName.toLowerCase() === 'ol') {
          const index = Array.from(parent.children).indexOf(node) + 1;
          return `${index}. ${liContent}\n`;
        }
        return `- ${liContent}\n`;
      }
      case 'table':
        return `\n${children}\n`;
      case 'thead':
      case 'tbody':
        return children;
      case 'tr': {
        const isHeaderRow = node.parentNode && node.parentNode.tagName.toLowerCase() === 'thead';
        let rowContent = `| ${children} |\n`;
        rowContent = rowContent.replace(/ \|  \| /g, ' | ');
        if (isHeaderRow) {
          const colCount = node.children.length;
          const separator = `| ${Array(colCount).fill('---').join(' | ')} |\n`;
          return rowContent + separator;
        }
        return rowContent;
      }
      case 'th':
      case 'td':
        return node.nextSibling === null ? children : `${children} |`;
      case 'br':
        return '<br>';
      case 'hr':
        return '\n---\n';
      case 'div':
        return `\n${children}`;
      default:
        return children;
    }
  }

  let markdown = Array.from(tempDiv.childNodes).map(parseNode).join('');

  markdown = markdown.replace(/^•(\s|&nbsp;|\u00a0)+/gm, '- ');
  markdown = markdown
    .replace(/\|\s*\|\n/g, '|\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^\n+/, '')
    .replace(/\n+$/, '');

  return markdown;
}

/**
 * Sanitize HTML before rendering with dangerouslySetInnerHTML.
 * Mirrors the allowlist approach used in TermsMarkdown (rehype-sanitize).
 */
const SANITIZE_ALLOWED_TAGS = new Set([
  'a', 'b', 'br', 'div', 'em', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'i', 'img', 'input', 'li', 'mark', 'ol', 'p', 'span', 'strong', 'sub',
  'sup', 'u', 'ul',
]);

const SANITIZE_GLOBAL_ATTRS = new Set(['class', 'style', 'data-indent', 'data-type', 'data-checked', 'data-color']);
const SANITIZE_TAG_ATTRS = {
  a: new Set(['href', 'target', 'rel']),
  img: new Set(['src', 'alt']),
  input: new Set(['type', 'checked', 'disabled']),
};

function isSafeHtmlUrl(value) {
  if (!value) return true;
  const trimmed = value.trim().toLowerCase();
  return !trimmed.startsWith('javascript:') && !trimmed.startsWith('data:text/html');
}

function sanitizeHtmlNode(node) {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent;
  }
  if (node.nodeType !== Node.ELEMENT_NODE) {
    return '';
  }

  const tag = node.tagName.toLowerCase();
  if (!SANITIZE_ALLOWED_TAGS.has(tag)) {
    return Array.from(node.childNodes).map(sanitizeHtmlNode).join('');
  }

  const allowedForTag = SANITIZE_TAG_ATTRS[tag] || new Set();
  const attrs = [];
  for (const attr of node.attributes) {
    const name = attr.name.toLowerCase();
    if (!SANITIZE_GLOBAL_ATTRS.has(name) && !allowedForTag.has(name)) continue;
    if ((name === 'href' || name === 'src') && !isSafeHtmlUrl(attr.value)) continue;
    attrs.push(`${name}="${attr.value.replace(/"/g, '&quot;')}"`);
  }

  const inner = Array.from(node.childNodes).map(sanitizeHtmlNode).join('');
  if (tag === 'br' || tag === 'img' || tag === 'input') {
    return `<${tag}${attrs.length ? ' ' + attrs.join(' ') : ''}>`;
  }
  return `<${tag}${attrs.length ? ' ' + attrs.join(' ') : ''}>${inner}</${tag}>`;
}

export function sanitizeHtml(html) {
  if (!html || typeof html !== 'string') return '';
  if (typeof DOMParser === 'undefined') {
    return html
      .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
      .replace(/\son\w+\s*=\s*(['"])[\s\S]*?\1/gi, '')
      .replace(/javascript:/gi, '');
  }
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return Array.from(doc.body.childNodes).map(sanitizeHtmlNode).join('');
}

export function sanitizedHtmlProps(html) {
  return { dangerouslySetInnerHTML: { __html: sanitizeHtml(html) } };
}
