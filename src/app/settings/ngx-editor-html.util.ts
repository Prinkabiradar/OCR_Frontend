type NormalizeOptions = {
  forStorage?: boolean;
};

export function normalizeNgxEditorHtml(
  html: string,
  options: NormalizeOptions = {},
): string {
  if (!html) return '';
  const forStorage = options.forStorage === true;
  const preserveFirstLineIndentForStorage = true;

  let normalized = html
    .replace(/margin-inline-start\s*:/gi, 'margin-left:')
    .replace(/padding-inline-start\s*:/gi, 'padding-left:')
    .replace(/\bmarginleft\s*:/gi, 'margin-left:')
    .replace(/\bmarginright\s*:/gi, 'margin-right:')
    .replace(/\bpaddingleft\s*:/gi, 'padding-left:')
    .replace(/\bpaddingright\s*:/gi, 'padding-right:')
    .replace(/\btextindent\s*:/gi, 'text-indent:')
    .replace(/\btextalign\s*:/gi, 'text-align:');

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
      const hasDataIndentAttr = Boolean(dataIndentMatch);
      if (dataIndentMatch) {
        const parsed = Number.parseInt(dataIndentMatch[2], 10);
        if (Number.isFinite(parsed) && parsed > 0) {
          level = parsed;
        }
      }

      let hasClassIndent = false;
      if (level === null) {
        const classIndentMatch = attrText.match(
          /\b(?:ql-indent|indent|editor-indent|pm-indent|level)-(\d+)\b/i,
        );
        hasClassIndent = Boolean(classIndentMatch);
        if (classIndentMatch) {
          const parsed = Number.parseInt(classIndentMatch[1], 10);
          if (Number.isFinite(parsed) && parsed > 0) {
            level = parsed;
          }
        }
      }
      const hasIndentAttr = /\bindent\s*=\s*(['"]?)\d+\1/i.test(attrText);

      const styleTextIndentMatch = attrText.match(/text-indent\s*:\s*([0-9.]+)\s*(px|em|rem)?/i);
      if (level === null) {
        if (styleTextIndentMatch) {
          const value = Number.parseFloat(styleTextIndentMatch[1]);
          const unit = (styleTextIndentMatch[2] || 'px').toLowerCase();
          if (Number.isFinite(value) && value > 0) {
            level = unit === 'em' || unit === 'rem'
              ? Math.round(value / 2)
              : Math.round(value / 40);
          }
        }
      }

      const stylePxMatch = attrText.match(/margin-left\s*:\s*([0-9.]+)\s*px/i);
      if (level === null) {
        if (stylePxMatch) {
          const px = Number.parseFloat(stylePxMatch[1]);
          if (Number.isFinite(px) && px > 0) {
            level = Math.round(px / 40);
          }
        }
      }

      const styleEmMatch = attrText.match(/margin-left\s*:\s*([0-9.]+)\s*em/i);
      if (level === null) {
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
      const hasPositiveTextIndent = (() => {
        if (!styleTextIndentMatch) return false;
        const textIndentValue = Number.parseFloat(styleTextIndentMatch[1]);
        return Number.isFinite(textIndentValue) && textIndentValue > 0;
      })();
      const hasPositiveMarginLeft = (() => {
        if (stylePxMatch) {
          const px = Number.parseFloat(stylePxMatch[1]);
          if (Number.isFinite(px) && px > 0) return true;
        }
        if (styleEmMatch) {
          const em = Number.parseFloat(styleEmMatch[1]);
          if (Number.isFinite(em) && em > 0) return true;
        }
        return false;
      })();
      const hasPositivePaddingLeft =
        /padding-left\s*:\s*(?:[0-9]*\.?[1-9][0-9.]*)\s*(?:px|em|rem|pt)\b/i.test(
          attrText,
        );

      // Preserve explicit mode when available. Otherwise infer from styles:
      // full-paragraph indentation typically uses left offset (margin/padding),
      // while first-line indentation uses text-indent.
      const isEditorIndentMarkup =
        hasDataIndentAttr || hasIndentAttr || hasClassIndent;
      const mode: 'first-line' | 'full' = modeMatch?.[2]?.toLowerCase() === 'full'
        ? 'full'
        : modeMatch?.[2]?.toLowerCase() === 'first-line'
          ? 'first-line'
          : isEditorIndentMarkup
            ? 'first-line'
            : hasPositiveMarginLeft && !hasPositiveTextIndent
              ? 'full'
            : hasPositiveMarginLeft || hasPositivePaddingLeft
              ? 'full'
            : hasPositiveTextIndent
                ? 'first-line'
              : 'first-line';

      // Keep indent attributes for both modes so downstream exporters
      // (PDF/Word) can reliably detect indentation intent.
      const shouldStripIndentAttrs =
        forStorage &&
        mode === 'first-line' &&
        !preserveFirstLineIndentForStorage;
      const baseAttrs = stripIndentAttrs(attrText);
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
