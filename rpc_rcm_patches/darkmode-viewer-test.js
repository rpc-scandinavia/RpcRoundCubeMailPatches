// Ensure the namespace exists.
window.rpc_rcm_patches = window.rpc_rcm_patches || {};

(function(ns) {

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
		const hsla = ns.rgbToHsl(effectiveBackColor);
		let invertedBackColorRgba = defaultDarkBackColorRgba;

		if ((hsla.l < 10) || ((effectiveBackColor.r === 0) && (effectiveBackColor.g === 0) && (effectiveBackColor.b === 0) && (effectiveBackColor.a === 0))) {
			invertedBackColorRgba = defaultDarkBackColorRgba;				// Transparent or very dark.
		} else if (hsla.l > lightnessThreshold) { // MODIFIED: Removed redundant nested if
			hsla.l = 20;
			hsla.s = (hsla.s === 0) ? 0 : Math.min(100, hsla.s + 30);		// Preserve grayscale.
			invertedBackColorRgba = ns.hslToRgb(hsla);
		} else {
			hsla.l = Math.max(10, hsla.l - 10);
			hsla.s = (hsla.s === 0) ? 0 : Math.min(100, hsla.s + 30);		// Preserve grayscale.
			invertedBackColorRgba = ns.hslToRgb(hsla);
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

			const fgHsla = ns.rgbToHsl(safeFgRgba);
			if (lumBg < 0.3) {
				fgHsla.l = Math.min(85, Math.max(70, fgHsla.l + 35));				// Light text for dark backgrounds.
				fgHsla.s = fgHsla.s === 0 ? 0 : Math.min(100, fgHsla.s + 30);		// Vibrant text.
			} else {
				fgHsla.l = Math.max(20, fgHsla.l - 40);								// Dark text for mid-tone backgrounds.
				fgHsla.s = fgHsla.s === 0 ? 0 : Math.min(100, fgHsla.s + 30);							// Vibrant text.
			}
			const result = ns.hslToRgb(fgHsla);
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
		const styleMap = ns.parseStyleString(originalStyle);

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
			element.setAttribute('style', ns.styleMapToString(styleMap) || '');
		} else {
			// Parse colours.
			const originalBackColorChoosen = (originalBackColorTable) ? originalBackColorTable : originalBackColor;
			const originalTextColorRgba = ns.parseColorToRgba(originalTextColor, computedStyle.color);
			const computedBackColorRgba = ns.parseColorToRgba(computedStyle.backgroundColor);
			const computedTextColorRgba = ns.parseColorToRgba(computedStyle.color);

			// Compute new background colour.
			let invertedBackColorRgba = invertBackColor(
				ns.parseColorToRgba(originalBackColorChoosen, computedStyle.backgroundColor),
				computedBackColorRgba,
				defaultDarkBackColorRgba,
				options.lightnessThreshold
			);

			// Increase the darkest background for tables if specified.
			if ((elementIsTable == true) && (options.tableBrightnessBoost > 0) && (!element.closest('table table'))) {
				// Increase lightness by options.tableBrightnessBoost %.
				const boostedHsla = ns.rgbToHsl(invertedBackColorRgba);
				boostedHsla.l = Math.min(100, boostedHsla.l + options.tableBrightnessBoost);
				invertedBackColorRgba = ns.hslToRgb(boostedHsla);
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
//				styleMap[styleMapBackColor] = ns.formatRgba(invertedBackColorRgba) + ' !important';

//				// Use unique class for higher specificity.
//				element.classList.add('darkmode-inverted-table');
			}
			if (styleMapBackColor) {
//				styleMap[styleMapBackColor] = ns.formatRgba(invertedBackColorRgba) + ' !important';
				styleMap[styleMapBackColor] = ns.formatRgba(invertedBackColorRgba);
			} else {
//				element.style.backgroundColor = ns.formatRgba(invertedBackColorRgba) + ' !important';
				element.style.backgroundColor = ns.formatRgba(invertedBackColorRgba);
			}
			if (styleMapTextColor) {
				styleMap[styleMapTextColor] = ns.formatRgba(invertedTextColorRgba);
			} else {
				element.style.color = ns.formatRgba(invertedTextColorRgba);
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
				'HSL:', ns.rgbToHsl(ns.parseColorToRgba(getComputedStyle(element).backgroundColor)));
}
*/

			// Update style attribute.
			element.setAttribute('style', ns.styleMapToString(styleMap) || '');

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
				'HSL:', ns.rgbToHsl(ns.parseColorToRgba(getComputedStyle(element).backgroundColor)));
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
