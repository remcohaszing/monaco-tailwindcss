import type * as m from 'monaco-editor';
import type { callWorker } from './TailwindHandler';
import { fromRatio, names as namedColors } from '@ctrl/tinycolor';
import {
  fromPosition,
  toCodeAction,
  toColorInformation,
  toHover,
  toMarkerData,
} from 'monaco-languageserver-types';
import { MarkerDataProvider } from 'monaco-marker-data-provider';

type CallWorkerType = typeof callWorker;

const colorNames = Object.values(namedColors);

const sheet = new CSSStyleSheet();
document.adoptedStyleSheets.push(sheet);

const editableColorRegex = new RegExp(
  `-\\[(${colorNames.join('|')}|((?:#|rgba?\\(|hsla?\\())[^\\]]+)\\]$`,
);

function colorValueToHex(value: number): string {
  return Math.round(value * 255)
    .toString(16)
    .padStart(2, '0');
}

export function createColorClass(color: m.languages.IColor): string {
  const hex = `${colorValueToHex(color.red)}${colorValueToHex(color.green)}${colorValueToHex(
    color.blue,
  )}`;
  const className = `tailwindcss-color-decoration-${hex}`;
  const selector = `.${className}`;
  for (const rule of sheet.cssRules) {
    if ((rule as CSSStyleRule).selectorText === selector) {
      return className;
    }
  }
  sheet.insertRule(`${selector}{background-color:#${hex}}`);
  return className;
}

export function createColorProvider(
  monaco: typeof m,
  callWorker: CallWorkerType,
): m.languages.DocumentColorProvider {
  const modelMap = new WeakMap<m.editor.ITextModel, string[]>();

  monaco.editor.onWillDisposeModel(model => {
    modelMap.delete(model);
  });

  return {
    async provideDocumentColors(model) {
      const colors = await callWorker('getDocumentColors', {
        uri: model.uri.toString(),
        languageId: model.getLanguageId(),
        mirrorModels: [
          {
            uri: model.uri.toJSON(),
            version: model.getVersionId(),
            value: model.getValue(),
          },
        ],
      });

      const editableColors: m.languages.IColorInformation[] = [];
      const nonEditableColors: m.editor.IModelDeltaDecoration[] = [];
      if (colors) {
        for (const lsColor of colors) {
          const monacoColor = toColorInformation(lsColor);
          const text = model.getValueInRange(monacoColor.range);
          if (editableColorRegex.test(text)) {
            editableColors.push(monacoColor);
          } else {
            nonEditableColors.push({
              range: monacoColor.range,
              options: {
                before: {
                  content: '\u00A0',
                  inlineClassName: `${createColorClass(monacoColor.color)} colorpicker-color-decoration`,
                  inlineClassNameAffectsLetterSpacing: true,
                },
              },
            });
          }
        }
      }

      modelMap.set(
        model,
        model.deltaDecorations(modelMap.get(model) ?? [], nonEditableColors),
      );

      return editableColors;
    },

    provideColorPresentations(model, colorInformation) {
      const className = model.getValueInRange(colorInformation.range);
      const match = new RegExp(
        `-\\[(${colorNames.join('|')}|(?:(?:#|rgba?\\(|hsla?\\())[^\\]]+)\\]$`,
        'i',
      ).exec(className);

      if (!match) {
        return [];
      }

      const [currentColor] = match;

      const isNamedColor = colorNames.includes(currentColor);
      const color = fromRatio({
        r: colorInformation.color.red,
        g: colorInformation.color.green,
        b: colorInformation.color.blue,
        a: colorInformation.color.alpha,
      });

      let hexValue = color.toHex8String(
        !isNamedColor &&
          (currentColor.length === 4 || currentColor.length === 5),
      );
      if (hexValue.length === 5) {
        hexValue = hexValue.replace(/f$/, '');
      } else if (hexValue.length === 9) {
        hexValue = hexValue.replace(/ff$/, '');
      }

      const rgbValue = color.toRgbString().replaceAll(' ', '');
      const hslValue = color.toHslString().replaceAll(' ', '');
      const prefix = className.slice(0, Math.max(0, match.index));

      return [
        { label: `${prefix}-[${hexValue}]` },
        { label: `${prefix}-[${rgbValue}]` },
        { label: `${prefix}-[${hslValue}]` },
      ];
    },
  };
}

export function createHoverProvider(
  callWorker: CallWorkerType,
): m.languages.HoverProvider {
  return {
    async provideHover(model, position) {
      const hover = await callWorker('doHover', {
        uri: model.uri.toString(),
        languageId: model.getLanguageId(),
        position: fromPosition(position),
        mirrorModels: [
          {
            uri: model.uri.toJSON(),
            version: model.getVersionId(),
            value: model.getValue(),
          },
        ],
      });

      return hover && toHover(hover);
    },
  };
}

export function createCodeActionProvider(
  callWorker: CallWorkerType,
): m.languages.CodeActionProvider {
  return {
    async provideCodeActions(model, range, context) {
      const codeActions = await callWorker('doCodeActions', {
        uri: model.uri.toString(),
        range: {
          start: fromPosition(range.getStartPosition()),
          end: fromPosition(range.getEndPosition()),
        },
        context,
        languageId: model.getLanguageId(),
        mirrorModels: [
          {
            uri: model.uri.toJSON(),
            version: model.getVersionId(),
            value: model.getValue(),
          },
        ],
      });

      if (codeActions) {
        return {
          actions: codeActions.map(toCodeAction),
          dispose() {
            // Do nothing
          },
        };
      }
    },
  };
}

export function createMarkerDataProvider(
  callWorker: CallWorkerType,
): MarkerDataProvider {
  return {
    owner: 'tailwindcss',
    async provideMarkerData(model) {
      const diagnostics = await callWorker('doValidate', {
        uri: model.uri.toString(),
        languageId: model.getLanguageId(),
        mirrorModels: [
          {
            uri: model.uri.toJSON(),
            version: model.getVersionId(),
            value: model.getValue(),
          },
        ],
      });

      return diagnostics?.map(toMarkerData);
    },
  };
}
