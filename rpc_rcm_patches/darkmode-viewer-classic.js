// Ensure the namespace exists.
window.rpc_rcm_patches = window.rpc_rcm_patches || {};

(function(ns) {
	//------------------------------------------------------------------------------------------------------------------
	// Mail viewer.
	//------------------------------------------------------------------------------------------------------------------
	function valuesToRgba(r, g, b, a) {
		return { r, g, b, a };
	} // valuesToRgba

	function parseRgba(str) {
		const match = str.match(/rgba?\((\d+), ?(\d+), ?(\d+)(?:, ?([\d.]+))?\)/);
		if (match == null) {
			return valuesToRgba(0, 0, 0, 0);
		}
		const [, r, g, b, a = 1] = match;
		return valuesToRgba(+r, +g, +b, +a);
	} // parseRgba

	function rgbToHsl({ r, g, b, a }) {
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
			s = delta / (1 - Math.abs(2 * l - 1));
		}

		return {
			h,
			s: +(s * 100).toFixed(1),
			l: +(l * 100).toFixed(1),
			a
		};
	} // rgbToHsl

	function styleMapToString(styleMap) {
		if (Object.keys(styleMap).length > 0) {
			return Object.entries(styleMap)
				.map(([key, val]) => `${key}: ${val}`)
				.join('; ');
		} else {
			return null;
		}
	} // styleMapToString

	function invertColors(originalBackColor, originalTextColor, originalStyleAttr) {
		// Parse style attribute string into a map.
		let styleMap = {};
		if (originalStyleAttr) {
			originalStyleAttr.split(';').forEach(part => {
				const [key, val] = part.split(':').map(s => s.trim());
				if ((key) && (val)) {
					styleMap[key.toLowerCase()] = val;
				}
			});
		}

		// Prefer style-defined colours.
		styleMapBackColor = null;
		if (styleMap['background']) {
			styleMapBackColor = 'background';
			originalBackColor = styleMap['background'];
		}
		if (styleMap['background-color']) {
			styleMapBackColor = 'background-color';
			originalBackColor = styleMap['background-color'];
		}
		if (styleMap['color']) {
			originalTextColor = styleMap['color'];
		}

		const bg = parseRgba(originalBackColor);
		const fg = parseRgba(originalTextColor);
		const hsla = rgbToHsl(bg);
		let newBackgroundColor = 'inherit';
		let newTextColor = 'inherit';

		if (hsla.l < 10) {
			// Very dark background → transparent.
			newBackgroundColor = 'transparent';
			newTextColor = 'inherit';
		} else if ((hsla.s < 10) && (hsla.l > 75)) {
			// Light grayish background.
			const invBg = { r: 255 - bg.r, g: 255 - bg.g, b: 255 - bg.b, a: bg.a };
			const invFg = { r: 255 - fg.r, g: 255 - fg.g, b: 255 - fg.b, a: fg.a };

			const invHSLA = rgbToHsl(invBg);
			if (invHSLA.l < 10) {
				newBackgroundColor = 'transparent';
				newTextColor = `rgba(${invFg.r}, ${invFg.g}, ${invFg.b}, ${invFg.a})`;
			} else {
				newBackgroundColor = `rgba(${invBg.r}, ${invBg.g}, ${invBg.b}, ${invBg.a})`;
				newTextColor = `rgba(${invFg.r}, ${invFg.g}, ${invFg.b}, ${invFg.a})`;
			}
		} else if ((bg.r === 0) && (bg.g === 0) && (bg.b === 0) && (bg.a === 0)) {
			const textHSLA = rgbToHsl(fg);
			if ((textHSLA.s < 15) && (textHSLA.l < 45)) {
				newBackgroundColor = 'inherit';
				newTextColor = `rgba(${255 - fg.r}, ${255 - fg.g}, ${255 - fg.b}, ${fg.a})`;
			}
		}

		// Update the style map.
		if (styleMapBackColor != null) {
			styleMap[styleMapBackColor] = newBackgroundColor;
		}
		if (styleMap['color']) {
			styleMap['color'] = newTextColor;
		}

		return {
			newBackground: newBackgroundColor,
			newText: newTextColor,
			newStyle: styleMapToString(styleMap)
		};
	} // invertColors

    ns.invert = function(element) {
        if ((element instanceof HTMLElement) == false) {
			return;
		}

		const originalBackground = element.style.backgroundColor;
		const originalText = element.style.color;
		const originalStyle = element.getAttribute('style');
		const { newBackground, newText, newStyle } = invertColors(originalBackground, originalText, originalStyle);

		element.setAttribute('data-orig-bg', originalBackground);
		element.setAttribute('data-orig-color', originalText);
		if (originalStyle != null) {
			element.setAttribute('data-orig-style', originalStyle);
		}

		element.style.backgroundColor = newBackground;
		element.style.color = newText;
		if (newStyle != null) {
			element.setAttribute('style', newStyle);
		}

		// Invert child elements.
		element.childNodes.forEach(child => {
			if (child instanceof HTMLElement) {
				ns.invert(child);
			}
		});
	} // invert

	ns.revert = function(element) {
		if ((element instanceof HTMLElement) == false) {
			return;
		}

		const origBackground = element.getAttribute('data-orig-bg');
		const origText = element.getAttribute('data-orig-color');
		const origStyle = element.getAttribute('data-orig-style');

		if (origBackground != null) {
			element.style.backgroundColor = origBackground;
			element.removeAttribute('data-orig-bg');
        }

		if (origText != null) {
			element.style.color = origText;
			element.removeAttribute('data-orig-color');
		}

		if (origStyle != null) {
			element.style = origStyle;
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
