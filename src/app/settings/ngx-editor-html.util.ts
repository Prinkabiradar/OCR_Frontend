export function normalizeNgxEditorHtml(html: string): string {
  if (!html) return '';

  let normalized = html
    .replace(/margin-inline-start\s*:/gi, 'margin-left:')
    .replace(/padding-inline-start\s*:/gi, 'padding-left:');

  normalized = normalized.replace(
    /\sclass\s*=\s*(['"])(.*?)\1/gi,
    (full, _quote, classValue) => {
      const classes = String(classValue || '');
      const match = classes.match(
        /\b(?:ql-indent|indent|editor-indent|pm-indent|level)-(\d+)\b/i,
      );
      if (!match) return full;
      const level = Number.parseInt(match[1], 10);
      if (!Number.isFinite(level) || level <= 0) return full;
      if (/\bdata-indent\s*=/.test(full)) return full;
      return `${full} data-indent="${level}"`;
    },
  );

  normalized = normalized.replace(
    /<(p|blockquote|h[1-6])([^>]*)>/gi,
    (fullTag, tag, attrs) => {
      const attrText = String(attrs || '');
      if (/(?:^|\s)indent\s*=/.test(attrText)) return fullTag;

      let level: number | null = null;

      const dataIndentMatch = attrText.match(
        /\bdata-indent\s*=\s*(['"]?)(\d+)\1/i,
      );
      if (dataIndentMatch) {
        const parsed = Number.parseInt(dataIndentMatch[2], 10);
        if (Number.isFinite(parsed) && parsed > 0) {
          level = parsed;
        }
      }

      if (level === null) {
        const classIndentMatch = attrText.match(
          /\b(?:ql-indent|indent|editor-indent|pm-indent|level)-(\d+)\b/i,
        );
        if (classIndentMatch) {
          const parsed = Number.parseInt(classIndentMatch[1], 10);
          if (Number.isFinite(parsed) && parsed > 0) {
            level = parsed;
          }
        }
      }

      if (level === null) {
        const stylePxMatch = attrText.match(/margin-left\s*:\s*([0-9.]+)\s*px/i);
        if (stylePxMatch) {
          const px = Number.parseFloat(stylePxMatch[1]);
          if (Number.isFinite(px) && px > 0) {
            level = Math.round(px / 40);
          }
        }
      }

      if (level === null) {
        const styleEmMatch = attrText.match(/margin-left\s*:\s*([0-9.]+)\s*em/i);
        if (styleEmMatch) {
          const em = Number.parseFloat(styleEmMatch[1]);
          if (Number.isFinite(em) && em > 0) {
            level = Math.round(em / 2);
          }
        }
      }

      if (level === null || !Number.isFinite(level) || level <= 0) return fullTag;

      const safeLevel = Math.max(1, Math.min(level, 12));
      const hasIndentStyle =
        /(margin-left\s*:|padding-left\s*:|text-indent\s*:)/i.test(attrText);

      let rebuilt = `<${tag}${attrText} indent="${safeLevel}">`;
      if (!hasIndentStyle) {
        const marginValue = `${safeLevel * 40}px`;
        if (/\sstyle\s*=\s*(['"])(.*?)\1/i.test(rebuilt)) {
          rebuilt = rebuilt.replace(
            /\sstyle\s*=\s*(['"])(.*?)\1/i,
            (_styleFull, q, styleValue) =>
              ` style=${q}${String(styleValue).trim().replace(/;?\s*$/, '; ')}margin-left: ${marginValue}${q}`,
          );
        } else {
          rebuilt = rebuilt.replace(
            /^<([a-z][\w:-]*)([^>]*)>$/i,
            `<$1$2 style="margin-left: ${marginValue}">`,
          );
        }
      }

      return rebuilt;
    },
  );

  return normalized;
}

