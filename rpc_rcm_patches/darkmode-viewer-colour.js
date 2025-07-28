(function() {
	//------------------------------------------------------------------------------------------------------------------
	// Mail viewer.
	//------------------------------------------------------------------------------------------------------------------
	// A transparent Rgba colour object.
	const transparenRgba = { r: 0, g: 0, b: 0, a: 0 };

	// A opaque black Rgba/Hsla colour objects.
	const blackRgba = { r: 0, g: 0, b: 0, a: 1 };
	const blackHsla = { h: 0, s: 0, l: 0, a: 1 };

	// Parses a colour strint to an Rgbs colour object.
	// Supports #rrggbb, #rrggbbaa, rgb(r,g,b), rgba(r,g,b,a), hsl(h,s,l), hsla(h,s,l,a).
	// String rawColorStr: The raw colour string to parse.
	// String computedColorStr: Optional fallback, incase the 'rawColorStr' can't be parsed, for instance 'orange'.
	// Rgba return: The parsed colour as an Rgbs colour object or null.
	function parseColorToRgba(rawColorStr, computedColorStr = '') {
		// Helper to normalize and validate RGBA values.
		// Int32 r: The red value (0 - 255).
		// Int32 g: The green value (0 - 255).
		// Int32 b: The blue value (0 - 255).
		// Decimal a: The alpha value  (0 - 1).
		// Rgbs return: The normalised values as an Rgbs colour object.
		function valuesToRgba(r, g, b, a = 1) {
			return {
				r: Math.max(0, Math.min(255, Math.round(r))),
				g: Math.max(0, Math.min(255, Math.round(g))),
				b: Math.max(0, Math.min(255, Math.round(b))),
				a: Math.max(0, Math.min(1, Number(a.toFixed(3))))
			};
		} // valuesToRgba

		// Helper to parse hex colour string.
		// Supports #rrggbb, #rrggbbaa.
		// String hexColorStr: The raw colour string to parse.
		// Rgba return: The parsed colour as an Rgbs colour object or null.
		function parseHex(hexColorStr) {
			hexColorStr = hexColorStr.replace(/^#/, '');
			let r, g, b, a = 1;
			if (hexColorStr.length === 6) {
				r = parseInt(hexColorStr.slice(0, 2), 16);
				g = parseInt(hexColorStr.slice(2, 4), 16);
				b = parseInt(hexColorStr.slice(4, 6), 16);
			} else if (hexColorStr.length === 8) {
				r = parseInt(hexColorStr.slice(0, 2), 16);
				g = parseInt(hexColorStr.slice(2, 4), 16);
				b = parseInt(hexColorStr.slice(4, 6), 16);
				a = parseInt(hexColorStr.slice(6, 8), 16) / 255;
			} else {
				return null;
			}
			return { r, g, b, a };
		} // parseHex

		// Helper to parse rgb/rgba colour string.
		// Supports rgb(r,g,b), rgba(r,g,b,a).
		// String rgbColorStr: The raw colour string to parse.
		// Rgba return: The parsed colour as an Rgba colour object or null.
		function parseRgb(rgbColorStr) {
			const match = rgbColorStr.match(/^rgb(a?)\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)$/i);
			if (!match) {
				return null;
			}
			const [, isRgba, r, g, b, a = 1] = match;
			return valuesToRgba(Number(r), Number(g), Number(b), Number(a));
		} // parseRgb

		// Helper to parse hsl/hsla colour string.
		// Supports hsl(h,s,l), hsla(h,s,l,a).
		// String hslColorString: The raw colour string to parse.
		// Rgba return: The parsed colour as an Rgbs colour object or null.
		function parseHsl(hslColorString) {
			const match = hslColorString.match(/^hsl(a?)\((\d+),\s*(\d+)%,\s*(\d+)%(?:,\s*([\d.]+))?\)$/i);
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

		// If parsing of the raw colour string succeeded, return the result but don't allow transparent result.
		if ((result) && (isNaN(result.r) == false) && (isNaN(result.g) == false) && (isNaN(result.b) == false) && (isNaN(result.a) == false)) {
        	return { ...result, a: (result.a === 0) ? 1 : result.a };
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

			// If parsing of the computed colour string succeeded, return the result but don't allow transparent result.
			if ((result) && (isNaN(result.r) == false) && (isNaN(result.g) == false) && (isNaN(result.b) == false) && (isNaN(result.a) == false)) {
				return { ...result, a: result.a === 0 ? 1 : result.a };
			}
		}

		// Default if all parsing fails.
		return blackRgba;
	} // parseColorToRgba

	// Converts a Rgba object to an Hsla object.
	// Int32 r: The red value (0 - 255).
	// Int32 g: The green value (0 - 255).
	// Int32 b: The blue value (0 - 255).
	// Decimal a: The alpha value  (0 - 1).
	// Hsla return: The converted colour as an Hsla object.
	function rgbToHsl({ r, g, b, a = 1 }) {
		// Validate inputs.
		if ((Number.isFinite(r) == false) || (Number.isFinite(g) == false) || (Number.isFinite(b) == false) || (Number.isFinite(a) == false) ||
			(r < 0) || (r > 255) || (g < 0) || (g > 255) || (b < 0) || (b > 255) || (a < 0) || (a > 1)) {
			return blackHsla;
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

	// Converts a Hsla object to an Rgba object.
	// Int32 h: The hue value (0 - 360).
	// Int32 s: The saturation value (0 - 100).
	// Int32 l: The lumination value (0 - 100).
	// Decimal a: The alpha value  (0 - 1).
	// Hsla return: The converted colour as an Hsla object.
	function hslToRgb({ h, s, l, a = 1 }) {
		// Validate inputs.
		if ((Number.isFinite(h) == false) || (h < 0) || (h > 360) ||
			(Number.isFinite(s) == false) || (s < 0) || (s > 100) ||
			(Number.isFinite(l) == false) || (l < 0) || (l > 100) ||
			(Number.isFinite(a) == false) || (a < 0) || (a > 1)) {
			return blackRgba;
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

	// Format the Rgba object to a string like "rgba(r,g,b,a)"
	// Int32 r: The red value (0 - 255).
	// Int32 g: The green value (0 - 255).
	// Int32 b: The blue value (0 - 255).
	// Decimal a: The alpha value  (0 - 1).
	// String return: The formatted colour.
	function formatRgba({ r, g, b, a }) {
		return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${a})`;
	} // formatRgba

	// Parses a style attribute string into an object containing the parsed key/value pairs.
	// The string contains key/value pairs like this: "background-color: white; color: black"
	// String style: The style attribute string.
	// Object return: The object containing the parsed key/value pairs.
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

	// Format the object containing the key/value pairs to a string like "background-color: white; color: black".
	// Object styleMap: The object containing the key/value pairs (prevuously produces with 'parseStyleString').
	// String return: The formatted object.
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
				fgHsla.s = fgHsla.s === 0 ? 0 : Math.min(100, fgHsla.s + 30);		// Vibrant text.
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
	function invert(element, defaultDarkBackColorRgba, options = { handleTables, tableBrightnessBoost, lightnessThreshold }) {
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
			}
			if (styleMapBackColor) {
				styleMap[styleMapBackColor] = formatRgba(invertedBackColorRgba);
			} else {
				element.style.backgroundColor = formatRgba(invertedBackColorRgba);
			}
			if (styleMapTextColor) {
				styleMap[styleMapTextColor] = formatRgba(invertedTextColorRgba);
			} else {
				element.style.color = formatRgba(invertedTextColorRgba);
			}

			// Update style attribute.
			element.setAttribute('style', styleMapToString(styleMap) || '');

			// Invert child elements.
			element.childNodes.forEach(child => {
				if (child instanceof HTMLElement) {
					invert(child, defaultDarkBackColorRgba, { ...options, tableBrightnessBoost: elementIsTable ? 0 : options.tableBrightnessBoost });
				}
			});
		}
	} // invert

	// Revert the HTML element and all child elements from the modifications made by teh 'invert' method..
	// HtmlElement element: The HTML element.
	function revert(element) {
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
				revert(child);
			}
		});
	} // revert

	document.addEventListener('DOMContentLoaded', () => {
		//--------------------------------------------------------------------------------------------------------------
		// Mail editor.
		// This plugin assumes that RCM adds and removes the "dark-mode" class on the "html" element, specifying whether dark
		// mode is enabled or not. But RCM does not set the "dark-mode" class on the "html" element when the mail editor is
		// created/initialised, RCM does however set the "dark-mode" class on the "html" element when the user toggles between
		// dark and light mode.
		//
		// Because the web page is reloaded when the user opens the mail editor to compose a new message, there is no need to
		// listen/observe anything, just check if TinyMCE is there, and set the class if needed in a TinyMCE 'init' event.
		//--------------------------------------------------------------------------------------------------------------
		if ((window.tinyMCE != null) && (document.documentElement.classList.contains('dark-mode')) == true) {
			window.tinyMCE.on('AddEditor', e => e.editor.on('init', () => e.editor.getDoc().documentElement.classList.add('dark-mode')));
		}

		//--------------------------------------------------------------------------------------------------------------
		// Mail viewer.
		//--------------------------------------------------------------------------------------------------------------
		const htmlElement = document.querySelector('html');
		const messageBodyElement = document.querySelector('#messagebody');

		// Get the body element of the message viewer, and only apply our logic if that body exist.
		if (messageBodyElement == null) {
			return;
		}

		// Try to prevent white flash.
		htmlElement.style.background = 'transparent';
		if (document.body) {
			document.body.style.background = 'transparent';
		}

		// Initialize the current state.
		let inverted = false;

		function toggleDarkMode() {
			const isDark = htmlElement.classList.contains('dark-mode');
			if ((isDark == true) && (inverted == false)) {
				invert(messageBodyElement, { r: 33, g: 41, b: 44, a: 1 }, { handleTables: true, tableBrightnessBoost: 1, lightnessThreshold: 35 });
				inverted = true;
			} else if ((isDark == false) && (inverted == true)) {
				revert(messageBodyElement);
				inverted = false;
			}
		} // toggleDarkMode

		// Initialize the current state.
		toggleDarkMode();

		// Observe when the 'dark-mode' class is added or removed from the HTML element.
		const htmlObserver = new MutationObserver((mutationsList) => {
			const wasDark = mutationsList.some(m => m.oldValue?.includes('dark-mode'));
			const isNowDark = htmlElement.classList.contains('dark-mode');
			if (wasDark !== isNowDark) {
				toggleDarkMode();
			}
		});

		htmlObserver.observe(htmlElement, {
			attributes: true,
			attributeFilter: ['class'],
			attributeOldValue: true
		});
	});
})();
