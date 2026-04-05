// Ensure the namespace exists.
window.rpc_rcm_patches = window.rpc_rcm_patches || {};

(function(ns) {
	//------------------------------------------------------------------------------------------------------------------
	// Mail viewer.
	//------------------------------------------------------------------------------------------------------------------
	const transparenRgba = { r: 0, g: 0, b: 0, a: 0 };

	function parseColorToRgba(rawColorStr, computedColorStr = '') {
		// Helper to normalize and validate RGBA values.
		function valuesToRgba(r, g, b, a = 1) {
			return {
					r: Math.max(0, Math.min(255, Math.round(r))),
					g: Math.max(0, Math.min(255, Math.round(g))),
					b: Math.max(0, Math.min(255, Math.round(b))),
					a: Math.max(0, Math.min(1, Number(a.toFixed(3))))
			};
		} // valuesToRgba

		// Helper to parse hex colour.
		function parseHex(hex) {
			hex = hex.replace(/^#/, '');
			let r, g, b, a = 1;
			if (hex.length === 6) {
				r = parseInt(hex.slice(0, 2), 16);
				g = parseInt(hex.slice(2, 4), 16);
				b = parseInt(hex.slice(4, 6), 16);
			} else if (hex.length === 8) {
				r = parseInt(hex.slice(0, 2), 16);
				g = parseInt(hex.slice(2, 4), 16);
				b = parseInt(hex.slice(4, 6), 16);
				a = parseInt(hex.slice(6, 8), 16) / 255;
			} else {
				return null;
			}
			return { r, g, b, a };
		} // parseHex

		// Helper to parse rgb/rgba string.
		function parseRgb(rgb) {
			const match = rgb.match(/^rgb(a?)\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)$/i);
			if (!match) {
				return null;
			}
			const [, isRgba, r, g, b, a = 1] = match;
			return valuesToRgba(Number(r), Number(g), Number(b), Number(a));
		} // parseRgb

		// Helper to parse hsl/hsla string.
		function parseHsl(hsl) {
			const match = hsl.match(/^hsl(a?)\((\d+),\s*(\d+)%,\s*(\d+)%(?:,\s*([\d.]+))?\)$/i);
			if (!match) {
				return null;
			}
			const [, isHsla, h, s, l, a = 1] = match;
			return hslToRgb({
				h: Number(h),
				s: Number(s) / 100,
				l: Number(l) / 100,
				a: Number(a)
			});
		} // parseHsl

		// Try parsing the raw colour string.
		let result = null;
		rawColorStr = rawColorStr.trim();

		if (rawColorStr.startsWith('#') == true) {
			result = parseHex(rawColorStr);
		} else if (rawColorStr.startsWith('rgb') == true) {
			result = parseRgb(rawColorStr);
		} else if (rawColorStr.startsWith('hsl') == true) {
			result = parseHsl(rawColorStr);
		}

		// If parsing of the raw colour string succeeded, return the result.
		if ((result) && (isNaN(result.r) == false) && (isNaN(result.g) == false) && (isNaN(result.b) == false) && (isNaN(result.a) == false)) {
        	return { ...result, a: result.a === 0 ? 1 : result.a };
    	}

		// Try parsing computed colour string as fallback.
		if (computedColorStr) {
			computedColorStr = computedColorStr.trim();
			if (computedColorStr.startsWith('#') == true) {
				result = parseHex(computedColorStr);
			} else if (computedColorStr.startsWith('rgb') == true) {
				result = parseRgb(computedColorStr);
			} else if (computedColorStr.startsWith('hsl') == true) {
				result = parseHsl(computedColorStr);
			}

			// If parsing of the computed colour string succeeded, return the result.
			if ((result) && (isNaN(result.r) == false) && (isNaN(result.g) == false) && (isNaN(result.b) == false) && (isNaN(result.a) == false)) {
				return { ...result, a: result.a === 0 ? 1 : result.a };
			}
		}

		// Default if all parsing fails.
		return valuesToRgba(0, 0, 0, 1);
	} // parseColorToRgba

	function rgbToHsl({ r, g, b, a = 1 }) {
		// Validate inputs.
		if ((Number.isFinite(r) == false) || (Number.isFinite(g) == false) || (Number.isFinite(b) == false) ||
			(r < 0) || (r > 255) || (g < 0) || (g > 255) || (b < 0) || (b > 255) || (Number.isFinite(a) == false) || (a < 0) || (a > 1)) {
			return { h: 0, s: 0, l: 0, a: 1 };
		}

		// Normalize RGB values.
		r /= 255;
		g /= 255;
		b /= 255;

		const cmin = Math.min(r, g, b);
		const cmax = Math.max(r, g, b);
		const delta = cmax - cmin;

		let h = 0;
		let s = 0;
		let l = (cmax + cmin) / 2;

		if (delta !== 0) {
			// Calculate hue.
			if (cmax === r) {
				h = ((g - b) / delta) % 6;
			} else if (cmax === g) {
				h = (b - r) / delta + 2;
			} else {
				h = (r - g) / delta + 4;
			}
			h = Math.round(h * 60);
			if (h < 0) {
				h += 360;
			}

			// Calculate saturation, handling edge cases.
			const denominator = 1 - Math.abs(2 * l - 1);
			s = denominator === 0 ? 0 : delta / denominator;
		}

		return {
			h,
			s: +(s * 100).toFixed(1),
			l: +(l * 100).toFixed(1),
			a
		};
	} // rgbToHsl

	function hslToRgb({ h, s, l, a = 1 }) {
		// Validate inputs.
		if ((Number.isFinite(h) == false) || (h < 0) || (h > 360) ||
			(Number.isFinite(s) == false) || (s < 0) || (s > 100) ||
			(Number.isFinite(l) == false) || (l < 0) || (l > 100) ||
			(Number.isFinite(a) == false) || (a < 0) || (a > 1)) {
			return { r: 0, g: 0, b: 0, a: 1 }; // Default to opaque black
		}

		h /= 360;
		s /= 100;
		l /= 100;

		let r = 0, g = 0, b = 0;

		if (s === 0) {
			r = g = b = l;
		} else {
			const hue2rgb = (p, q, t) => {
				if (t < 0) {
					t += 1;
				}
				if (t > 1) {
					t -= 1;
				}
				if (t < 1 / 6) {
					return p + (q - p) * 6 * t;
				}
				if (t < 1 / 2) {
					return q;
				}
				if (t < 2 / 3) {
					return p + (q - p) * (2 / 3 - t) * 6;
				}
				return p;
			};
			const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
			const p = 2 * l - q;
			r = hue2rgb(p, q, h + 1 / 3);
			g = hue2rgb(p, q, h);
			b = hue2rgb(p, q, h - 1 / 3);
		}

		return {
			r: Math.round(r * 255),
			g: Math.round(g * 255),
			b: Math.round(b * 255),
			a
		};
	} // hslToRgb

	function formatRgba({ r, g, b, a }) {
		return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${a})`;
	} // formatRgba

	function parseStyleString(style) {
		const styleMap = {};
		if (!style) {
			return styleMap;
		}

		style.split(';').forEach(part => {
			const match = part.match(/^\s*([^:]+)\s*:\s*(.+)\s*$/);
			if (match) {
				styleMap[match[1].toLowerCase()] = match[2];
			}
		});
		return styleMap;
	} // parseStyleString

	function styleMapToString(styleMap) {
		const validStyles = Object.entries(styleMap)
			.filter(([key, val]) => /^[a-z-]+$/i.test(key) && val != null)
			.map(([key, val]) => `${key}: ${val.trim()}`);
		return (validStyles.length > 0) ? validStyles.join('; ') : '';
	} // styleMapToString

	// Invert the background colours for use with dark mode.
	// The following rules apply:
	// * Choose the visible background colour between 'originalBackColorRgba' and 'computedBackColorRgba'.
	// * Inverted background colours are not darker then the specified 'defaultDarkBackColorRgba'.
	// * Invert colours with a brightness greater then the specified 'lightnessThreshold', otherwise darken.
	// Rgba originalBackColorRgba: The original background colour in RGBA.
	// Rgba computedBackColorRgba: The computed background colour in RGBA.
	// Rgba defaultDarkBackColorRgba: The dark mode background colour.
	// Int32 lightnessThreshold: Grayscale bright backgrounds above this trashold. Example value 35.
	// Rgba return: The inverted background colour.
	function invertBackColor(originalBackColorRgba, computedBackColorRgba, defaultDarkBackColorRgba, lightnessThreshold) {
		const effectiveBackColor = ((computedBackColorRgba) && (computedBackColorRgba.a > 0)) ? computedBackColorRgba : originalBackColorRgba;
		const hsla = rgbToHsl(effectiveBackColor);
		let invertedBackColorRgba = defaultDarkBackColorRgba;

		if ((hsla.l < 10) || ((effectiveBackColor.r === 0) && (effectiveBackColor.g === 0) && (effectiveBackColor.b === 0) && (effectiveBackColor.a === 0))) {
			invertedBackColorRgba = defaultDarkBackColorRgba;				// Transparent or very dark.
		} else if (hsla.l > lightnessThreshold) { // MODIFIED: Removed redundant nested if
			hsla.l = 20;
			hsla.s = (hsla.s === 0) ? 0 : Math.min(100, hsla.s + 30);		// Preserve grayscale.
			invertedBackColorRgba = hslToRgb(hsla);
		} else {
			hsla.l = Math.max(10, hsla.l - 10);
			hsla.s = (hsla.s === 0) ? 0 : Math.min(100, hsla.s + 30);		// Preserve grayscale.
			invertedBackColorRgba = hslToRgb(hsla);
		}

		return invertedBackColorRgba;
	} // invertBackColor

	// Invert the text colours for use with dark mode.
	// The following rules apply:
	// * Choose the visible text colour between 'originalTextColorRgba' and 'computedTextColorRgba'.
	// * Inverted text colours must have a good contrast in relation to the specified 'originalBackColorRgba'.
	// * Inverted text colours must retain their colours, and not just gray-scaled.
	// Rgba originalTextColorRgbs: The original text colour.
	// Rgba computedTextColorRgba: The computed text colour.
	// Rgba invertedBackColorRgba: The inverted background colour (inverted result from 'invertBackColor').
	// Rgba return: The inverted background colour.
	function invertTextColor(originalTextColorRgbs, computedTextColorRgba, invertedBackColorRgba) {
		function getLuminance({ r, g, b }) {
			const a = [r, g, b].map(v => {
				v /= 255;
				return (v <= 0.03928) ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
			});
			return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
		} // getLuminance

		function ensureContrast(bgRgba, fgRgba) {
			const safeFgRgba = { ...fgRgba, a: fgRgba.a === 0 ? 1 : fgRgba.a };
			const lumBg = getLuminance(bgRgba);
			const lumFg = getLuminance(safeFgRgba);
			const contrast = (Math.max(lumBg, lumFg) + 0.05) / (Math.min(lumBg, lumFg) + 0.05);
			if (contrast >= 4.5) {
				return safeFgRgba;
			}

			const fgHsla = rgbToHsl(safeFgRgba);
			if (lumBg < 0.3) {
				fgHsla.l = Math.min(85, Math.max(70, fgHsla.l + 35));				// Light text for dark backgrounds.
				fgHsla.s = fgHsla.s === 0 ? 0 : Math.min(100, fgHsla.s + 30);		// Vibrant text.
			} else {
				fgHsla.l = Math.max(20, fgHsla.l - 40);								// Dark text for mid-tone backgrounds.
				fgHsla.s = fgHsla.s === 0 ? 0 : Math.min(100, fgHsla.s + 30);							// Vibrant text.
			}
			const result = hslToRgb(fgHsla);
			return { ...result, a: safeFgRgba.a };
		} // ensureContrast

		const effectiveTextColor = ((computedTextColorRgba) && (computedTextColorRgba.a > 0)) ? computedTextColorRgba : { ...originalTextColorRgbs, a: originalTextColorRgbs.a === 0 ? 1 : originalTextColorRgbs.a };
		return ensureContrast(invertedBackColorRgba, effectiveTextColor);
	} // invertTextColor

	// Invert the HTML element and all child elements for use with dark mode.
	// HtmlElement element: The HTML element.
	// Rgba defaultDarkBackColorRgba: The dark mode background colour.
	// Boolean options.handleTables: Whether table-elements and their child elements should be darkenend.
	// Int32 tableBrightnessBoost: Add extra brightness in % to table background, so it stands out. Example value 5.
	// Int32 lightnessThreshold: Grayscale bright backgrounds above this trashold. Example value 35.
	function invertElement(element, defaultDarkBackColorRgba, options = { handleTables, tableBrightnessBoost, lightnessThreshold }) {
		if ((element instanceof HTMLElement) == false) {
			return;
		}

		// Get original values.
		let originalBackColorTable = element.getAttribute('bgcolor') || '';				// Handle edge cases like: bgcolor="#f2f2f2".
		let originalBackColor = element.style.backgroundColor || '';
		let originalTextColor = element.style.color || '';
		const originalStyle = element.getAttribute('style') || '';
		const computedStyle = getComputedStyle(element);

		// Parse style attribute.
		const styleMap = parseStyleString(originalStyle);

		// Prefer style-defined colors and store originals.
		let styleMapBackColor = null;
		if (styleMap['background']) {
			originalBackColor = styleMap['background'];
			styleMapBackColor = 'background';
		}
		if (styleMap['background-color']) {
			originalBackColor = styleMap['background-color'];
			styleMapBackColor = 'background-color';
		}
		let styleMapTextColor = null;
		if (styleMap['color']) {
			originalTextColor = styleMap['color'];
			styleMapTextColor = 'color';
		}

		// Save original values.
		if (originalBackColorTable) {
			element.setAttribute('data-orig-bg-tbl', originalBackColorTable);
		}
		if (originalBackColor) {
			element.setAttribute('data-orig-bg', originalBackColor);
		}
		if (originalTextColor) {
			element.setAttribute('data-orig-fg', originalTextColor);
		}
		if (originalStyle) {
			element.setAttribute('data-orig-style', originalStyle);
		}

		// Skip inversion for tables if handleTables is false.
		const elementHasExplicitBackground = ((styleMap['background']) || (styleMap['background-color']) || (element.style.backgroundColor) || (originalBackColorTable));
		const elementIsTable = (element.tagName.toLowerCase() === 'table');
		if ((options.handleTables == false) && (elementIsTable == true)) {
			// Ensure that the colours is correct inside the table.
			const newBackground = computedStyle.backgroundColor;
			const newText = computedStyle.color;

			// Apply colours.
			if (elementHasExplicitBackground) {
				if (styleMapBackColor) {
					styleMap[styleMapBackColor] = newBackground;
				} else {
					element.style.backgroundColor = newBackground;
				}
			}
			if (styleMapTextColor) {
				styleMap[styleMapTextColor] = newText;
			} else {
				element.style.color = newText;
			}

			// Update style attribute.
			element.setAttribute('style', styleMapToString(styleMap) || '');
		} else {
			// Parse colours.
			const originalBackColorChoosen = (originalBackColorTable) ? originalBackColorTable : originalBackColor;
			const originalTextColorRgba = parseColorToRgba(originalTextColor, computedStyle.color);
			const computedBackColorRgba = parseColorToRgba(computedStyle.backgroundColor);
			const computedTextColorRgba = parseColorToRgba(computedStyle.color);

			// Compute new background colour.
			let invertedBackColorRgba = invertBackColor(
				parseColorToRgba(originalBackColorChoosen, computedStyle.backgroundColor),
				computedBackColorRgba,
				defaultDarkBackColorRgba,
				options.lightnessThreshold
			);

			// Increase the darkest background for tables if specified.
			if ((elementIsTable == true) && (options.tableBrightnessBoost > 0) && (!element.closest('table table'))) {
				// Increase lightness by options.tableBrightnessBoost %.
				const boostedHsla = rgbToHsl(invertedBackColorRgba);
				boostedHsla.l = Math.min(100, boostedHsla.l + options.tableBrightnessBoost);
				invertedBackColorRgba = hslToRgb(boostedHsla);
			}

			// Compute new text colour using final background.
			const invertedTextColorRgba = invertTextColor(
				originalTextColorRgba,
				computedTextColorRgba,
				invertedBackColorRgba
			);

			// Apply colours.
			if ((originalBackColorTable) && (elementIsTable == true)) {
				// Use the better supported 'background-color'.
				element.removeAttribute('bgcolor');
				styleMapBackColor = 'background-color';
//				styleMap[styleMapBackColor] = formatRgba(invertedBackColorRgba) + ' !important';

//				// Use unique class for higher specificity.
//				element.classList.add('darkmode-inverted-table');
			}
			if (styleMapBackColor) {
//				styleMap[styleMapBackColor] = formatRgba(invertedBackColorRgba) + ' !important';
				styleMap[styleMapBackColor] = formatRgba(invertedBackColorRgba);
			} else {
//				element.style.backgroundColor = formatRgba(invertedBackColorRgba) + ' !important';
				element.style.backgroundColor = formatRgba(invertedBackColorRgba);
			}
			if (styleMapTextColor) {
				styleMap[styleMapTextColor] = formatRgba(invertedTextColorRgba);
			} else {
				element.style.color = formatRgba(invertedTextColorRgba);
			}

/*
// Clear backgrounds for all table descendants
if (elementIsTable == true) {
	element.querySelectorAll('tr, td, table').forEach(child => {
		child.style.backgroundColor = 'transparent !important';
		// Debug descendant backgrounds
		console.log('Descendant:', child.tagName, 'Computed Background:', getComputedStyle(child).backgroundColor);
	});
	// Debug computed style for table
	console.log('Table:', element.getAttribute('bgcolor') || 'No bgcolor',
				'Computed:', getComputedStyle(element).backgroundColor,
				'HSL:', rgbToHsl(parseColorToRgba(getComputedStyle(element).backgroundColor)));
}
*/

			// Update style attribute.
			element.setAttribute('style', styleMapToString(styleMap) || '');

			// Invert child elements.
			element.childNodes.forEach(child => {
				if (child instanceof HTMLElement) {
					js.invert(child, defaultDarkBackColorRgba, { ...options, tableBrightnessBoost: elementIsTable ? 0 : options.tableBrightnessBoost });
				}
			});

/*
// NEW: Reapply transparent backgrounds to descendants after child inversion
if (elementIsTable == true) {
	element.querySelectorAll('tr, td, table').forEach(child => {
		child.style.backgroundColor = 'transparent !important';
		// Debug final descendant backgrounds
		console.log('Final Descendant:', child.tagName, 'Computed Background:', getComputedStyle(child).backgroundColor);
	});
	// Debug final computed style for table
	console.log('Table Final:', element.getAttribute('bgcolor') || 'No bgcolor',
				'Computed:', getComputedStyle(element).backgroundColor,
				'HSL:', rgbToHsl(parseColorToRgba(getComputedStyle(element).backgroundColor)));
}
*/

		}
	} // invertElement

	// Invert the HTML element and all child elements for use with dark mode.
	// HtmlElement element: The HTML element.
    ns.invert = function(element) {
		if ((element instanceof HTMLElement) == false) {
			return;
		}

		invertElement(element, { r: 33, g: 41, b: 44, a: 1 }, { handleTables: true, tableBrightnessBoost: 5, lightnessThreshold: 35 });
	} // invert

	// Revert the HTML element and all child elements from the modifications made by teh 'invert' method..
	// HtmlElement element: The HTML element.
	ns.revert = function(element) {
		if ((element instanceof HTMLElement) == false) {
			return;
		}

		const origBackColorTable = element.getAttribute('data-orig-bg-tbl');
		const origBackColor = element.getAttribute('data-orig-bg');
		const origTextColor = element.getAttribute('data-orig-fg');
		const origStyle = element.getAttribute('data-orig-style');

		const elementIsTable = (element.tagName.toLowerCase() === 'table');
		if ((origBackColorTable != null) && (elementIsTable == true)) {
			element.setAttribute('bgcolor', origBackColorTable)
			element.removeAttribute('data-orig-bg-tbl');
		}

		if (origBackColor != null) {
			element.style.backgroundColor = origBackColor;
			element.removeAttribute('data-orig-bg');
		}

		if (origTextColor != null) {
			element.style.color = origTextColor;
			element.removeAttribute('data-orig-fg');
		}

		if (origStyle != null) {
			element.setAttribute('style', origStyle)
			element.removeAttribute('data-orig-style');
		}

		// Revert child elements.
		element.childNodes.forEach(child => {
			if (child instanceof HTMLElement) {
				ns.revert(child);
			}
		});
	} // revert

})(window.rpc_rcm_patches);
