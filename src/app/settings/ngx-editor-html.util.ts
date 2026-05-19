type NormalizeOptions = {
  forStorage?: boolean;
};

export function normalizeNgxEditorHtml(
  html: string,
  options: NormalizeOptions = {},
): string {
  if (!html) return '';
  const forStorage = options.forStorage === true;

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

      let level: number | null = null;

      const indentAttrMatch = attrText.match(/\bindent\s*=\s*(['"]?)(\d+)\1/i);
      if (indentAttrMatch) {
        const parsed = Number.parseInt(indentAttrMatch[2], 10);
        if (Number.isFinite(parsed) && parsed > 0) {
          level = parsed;
        }
      }

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
        const styleTextIndentMatch = attrText.match(/text-indent\s*:\s*([0-9.]+)\s*em/i);
        if (styleTextIndentMatch) {
          const em = Number.parseFloat(styleTextIndentMatch[1]);
          if (Number.isFinite(em) && em > 0) {
            level = Math.round(em / 2);
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

      const modeMatch = attrText.match(/\bdata-indent-mode\s*=\s*(['"]?)(first-line|full)\1/i);
      // Default to first-line when mode is missing so toolbar indent remains
      // consistent between editor view and exported PDF/Word.
      const mode: 'first-line' | 'full' =
        modeMatch?.[2]?.toLowerCase() === 'full' ? 'full' : 'first-line';

      const shouldStripIndentAttrs = forStorage && mode === 'first-line';
      const baseAttrs = shouldStripIndentAttrs ? stripIndentAttrs(attrText) : attrText;
      const indentAttrs = shouldStripIndentAttrs
        ? ` data-indent-mode="first-line"`
        : ` indent="${safeLevel}" data-indent="${safeLevel}" data-indent-mode="${mode}"`;

      let rebuilt = `<${tag}${baseAttrs}${indentAttrs}>`;
      const styleValue = mode === 'full'
        ? `margin-left: ${safeLevel * 40}px; text-indent: 0;`
        : `margin-left: 0; text-indent: ${safeLevel * 2}em;`;

      if (/\sstyle\s*=\s*(['"])(.*?)\1/i.test(rebuilt)) {
        rebuilt = rebuilt.replace(
          /\sstyle\s*=\s*(['"])(.*?)\1/i,
          (_styleFull, q, rawStyle) => {
            const cleaned = removeStyleProps(String(rawStyle || ''), [
              'margin-left',
              'padding-left',
              'text-indent',
            ]);
            const merged = `${cleaned}${cleaned ? '; ' : ''}${styleValue}`.trim();
            return ` style=${q}${merged}${q}`;
          },
        );
      } else {
        rebuilt = rebuilt.replace(
          /^<([a-z][\w:-]*)([^>]*)>$/i,
          `<$1$2 style="${styleValue}">`,
        );
      }

      return rebuilt;
    },
  );

  return normalized;
}

function removeStyleProps(styleText: string, props: string[]): string {
  const style = styleText.trim();
  if (!style) return '';

  const propSet = new Set(props.map((p) => p.toLowerCase()));
  return style
    .split(';')
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .filter((chunk) => {
      const colonIndex = chunk.indexOf(':');
      if (colonIndex <= 0) return true;
      const propName = chunk.slice(0, colonIndex).trim().toLowerCase();
      return !propSet.has(propName);
    })
    .join('; ');
}

function stripIndentAttrs(attrText: string): string {
  return attrText
    .replace(/\s+indent\s*=\s*(['"]).*?\1/gi, '')
    .replace(/\s+data-indent\s*=\s*(['"]).*?\1/gi, '')
    .replace(/\s+data-indent-mode\s*=\s*(['"]).*?\1/gi, '');
}
