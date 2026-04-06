// Ensure the namespace exists.
window.rpc_rcm_patches = window.rpc_rcm_patches || {};

(function(ns) {
	//------------------------------------------------------------------------------------------------------------------
	// Colours.
	//------------------------------------------------------------------------------------------------------------------
	// Colour objects.
	ns.defaultDarkBackColorRgba = { r: 33, g: 41, b: 44, a: 1 };	// A dark background RGBA colour object.
	ns.transparenRgba = { r: 0, g: 0, b: 0, a: 0 };					// A transparent RGBA colour object.
	ns.blackRgba = { r: 0, g: 0, b: 0, a: 1 };						// A opaque black RGBA colour object.
	ns.blackHsla = { h: 0, s: 0, l: 0, a: 1 };						// A opaque black HSLA colour object.

	// Helper to parse a colour string to an RGBA colour object.
	// Supports #rrggbb, #rrggbbaa, rgb(r,g,b), rgba(r,g,b,a), hsl(h,s,l), hsla(h,s,l,a).
	// String rawColorStr: The raw colour string to parse.
	// String computedColorStr: Optional fallback, incase the 'rawColorStr' can't be parsed, for instance 'orange'.
	// RGBA return: The parsed colour as an RGBA colour object or null.
	ns.parseColorToRgba = function(rawColorStr, computedColorStr = "") {
		// Helper to normalize and validate RGBA values.
		// Int32 r: The red value (0 - 255).
		// Int32 g: The green value (0 - 255).
		// Int32 b: The blue value (0 - 255).
		// Decimal a: The alpha value  (0 - 1).
		// RGBA return: The normalised values as an RGBA colour object.
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
		// RGBA return: The parsed colour as an RGBA colour object or null.
		function parseHex(hexColorStr) {
			hexColorStr = hexColorStr.replace(/^#/, "");
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
		// RGBA return: The parsed colour as an RGBA colour object or null.
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
		// RGBA return: The parsed colour as an RGBA colour object or null.
		function parseHsl(hslColorString) {
			const match = hslColorString.match(/^hsl(a?)\((\d+),\s*(\d+)%,\s*(\d+)%(?:,\s*([\d.]+))?\)$/i);
			if (!match) {
				return null;
			}
			const [, isHsla, h, s, l, a = 1] = match;
			return ns.hslToRgb({
				h: Number(h),
				s: Number(s) / 100,
				l: Number(l) / 100,
				a: Number(a)
			});
		} // parseHsl

		// Try parsing the raw colour string.
		let result = null;
		rawColorStr = rawColorStr.toString().trim();

		if (rawColorStr.startsWith("#") == true) {
			result = parseHex(rawColorStr);
		} else if (rawColorStr.startsWith("rgb") == true) {
			result = parseRgb(rawColorStr);
		} else if (rawColorStr.startsWith("hsl") == true) {
			result = parseHsl(rawColorStr);
		}

		// If parsing of the raw colour string succeeded, return the result but don't allow transparent result.
		if ((result) && (isNaN(result.r) == false) && (isNaN(result.g) == false) && (isNaN(result.b) == false) && (isNaN(result.a) == false)) {
        	return { ...result, a: (result.a === 0) ? 1 : result.a };
    	}

		// Try parsing computed colour string as fallback.
		if (computedColorStr) {
			computedColorStr = computedColorStr.toString().trim();
			if (computedColorStr.startsWith("#") == true) {
				result = parseHex(computedColorStr);
			} else if (computedColorStr.startsWith("rgb") == true) {
				result = parseRgb(computedColorStr);
			} else if (computedColorStr.startsWith("hsl") == true) {
				result = parseHsl(computedColorStr);
			}

			// If parsing of the computed colour string succeeded, return the result but don't allow transparent result.
			if ((result) && (isNaN(result.r) == false) && (isNaN(result.g) == false) && (isNaN(result.b) == false) && (isNaN(result.a) == false)) {
				return { ...result, a: result.a === 0 ? 1 : result.a };
			}
		}

		// Default if all parsing fails.
		return ns.blackRgba;
	} // ns.parseColorToRgba

	// Converts a RGBA object to an Hsla object.
	// Int32 r: The red value (0 - 255).
	// Int32 g: The green value (0 - 255).
	// Int32 b: The blue value (0 - 255).
	// Decimal a: The alpha value  (0 - 1).
	// Hsla return: The converted colour as an Hsla object.
	ns.rgbToHsl = function({ r, g, b, a = 1 }) {
		// Validate inputs.
		if ((Number.isFinite(r) == false) || (Number.isFinite(g) == false) || (Number.isFinite(b) == false) || (Number.isFinite(a) == false) ||
			(r < 0) || (r > 255) || (g < 0) || (g > 255) || (b < 0) || (b > 255) || (a < 0) || (a > 1)) {
			return ns.blackHsla;
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
	} // ns.rgbToHsl

	// Converts a Hsla object to an RGBA object.
	// Int32 h: The hue value (0 - 360).
	// Int32 s: The saturation value (0 - 100).
	// Int32 l: The lumination value (0 - 100).
	// Decimal a: The alpha value  (0 - 1).
	// Hsla return: The converted colour as an Hsla object.
	ns.hslToRgb = function({ h, s, l, a = 1 }) {
		// Validate inputs.
		if ((Number.isFinite(h) == false) || (h < 0) || (h > 360) ||
			(Number.isFinite(s) == false) || (s < 0) || (s > 100) ||
			(Number.isFinite(l) == false) || (l < 0) || (l > 100) ||
			(Number.isFinite(a) == false) || (a < 0) || (a > 1)) {
			return ns.blackRgba;
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
	} // ns.hslToRgb

	// Format the RGBA object to a string like "rgba(r,g,b,a)"
	// Int32 r: The red value (0 - 255).
	// Int32 g: The green value (0 - 255).
	// Int32 b: The blue value (0 - 255).
	// Decimal a: The alpha value  (0 - 1).
	// String return: The formatted colour.
	ns.formatRgba = function ({ r, g, b, a }) {
		return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${a})`;
	} // ns.formatRgba

	//------------------------------------------------------------------------------------------------------------------
	// Style.
	//------------------------------------------------------------------------------------------------------------------
	// Parses a style attribute string into an object containing the parsed key/value pairs.
	// The string contains key/value pairs like this: "background-color: white; color: black"
	// String style: The style attribute string.
	// Object return: The object containing the parsed key/value pairs.
	ns.parseStyleString = function(style) {
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
	} // ns.parseStyleString

	// Format the object containing the key/value pairs to a string like "background-color: white; color: black".
	// Object styleMap: The object containing the key/value pairs (previously produces with 'parseStyleString').
	// String return: The formatted object.
	ns.styleMapToString = function (styleMap) {
		const validStyles = Object.entries(styleMap)
			.filter(([key, val]) => /^[a-z-]+$/i.test(key) && val != null)
			.map(([key, val]) => `${key}: ${val.toString().trim()}`);
		return (validStyles.length > 0) ? validStyles.join("; ") : "";
	} // ns.styleMapToString

})(window.rpc_rcm_patches);
