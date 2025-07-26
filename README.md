# RPC RoundCubeMail Patches
This plugin for RoundCubeMail version 1.7, patches dark mode for the mail editor and the mail viewer.

It also includes a customized version of the Inter font made by Rasmus Andersson from Scandinavia, released under SIL Open Font License version 1.1.
https://github.com/rsms/inter/  and  https://rsms.me/inter/

It extends the mail editor dark mode work done by Dhiego Cassiano Fogaça Barbosa, which is released under Apache License version 2.0.
https://github.com/modscleo4/roundcube-plugin-dark-html

## Prerequisites
This plugin assumes that RCM adds and removes the `dark-mode` class on the `html` element, specifying whether **dark mode** is enabled and not:

* For the web program itself
* For the mail viewer `iframe`
* For the mail editor `iframe` (TinyMCE)

## Mail viewer

### Known bugs
Minor: Sometimes there is a white flash when a mail is selected. I haven't been able to find the **css** that causes this.

## Mail editor (TinyMCE)
RCM does not set the 'dark-mode' class on the `html` element when the mail editor is created/initialised, RCM does however set the 'dark-mode' class on the `html` element when the user toggles between **dark** and **light** mode.

### Fix missing class
This requires editing of the **java script** code. This can be done manually, or automatically by enabling the `auto_patch_editor_min_js` configuration option.

* Backup the original `program/js/editor.min.js`
* Copy the `program/js/editor.js` file to `program/js/editor.min.js`
* Patch the (unminified) `program/js/editor.min.js` after the initialisation with this:

```js
/* rpc_rcm_patch */
if ($('html').hasClass('dark-mode') == true) {
	tinymce.on('AddEditor', e => e.editor.on('init', () =>
		e.editor.getDoc().documentElement.classList.add('dark-mode')
	));
}
```

### Fix **css**
The message editor **css** is fixed by creating a new **css** file containing the existing **css** from `skins/elastic/styles/embed.min.css` and some additional **css**. The RCM configuration setting `editor_css_location` is set with the path to the new combined **css** file, which causes RCM to use that file when it initialises the mail editor (TinyMCE).

### Known bugs
Minor: The unminified version of `program/js/editor.js` is used.
Minor: Not all the used **css** is minified.


René Paw Christensen
https://rpc-scandinavia.dk/
