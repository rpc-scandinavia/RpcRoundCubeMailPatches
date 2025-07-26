<?php
// ┌────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
// │  SCRIPT: plugins/rpc_rcm_patches/rpc_rcm_patches.php                                                               │
// │ VERSION: 2025-07-25 Initial version for RCM versopm 1.7.                                                           │
// │  SYSTEM: RoundCubeMail version 1.7.                                                                                │
// │ LICENSE: GNU General Public License (GPL) version 3.                                                               │
// │FUNCTION: This plugin for RoundCubeMail, patches dark mode for the mail editor and the mail viewer.                 │
// │                                                                                                                    │
// │          It also includes a customized version of the Inter font made by Rasmus Andersson from Scandinavia,        │
// │          released under SIL Open Font License version 1.1.                                                         │
// │          https://github.com/rsms/inter/  and  https://rsms.me/inter/                                               │
// │                                                                                                                    │
// │          It extends the mail editor dark mode work done by Dhiego Cassiano Fogaça Barbosa, which is released       │
// │          under Apache License version 2.0.                                                                         │
// │          https://github.com/modscleo4/roundcube-plugin-dark-html                                                   │
// │                                                                                                                    │
// │          RPC: https://rpc-scandinavia.dk/                                                                          │
// │                                                                                                                    │
// └────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

class rpc_rcm_patches extends rcube_plugin {
    public $task = 'mail';

    function init() {
		$rcmail = rcmail::get_instance();

        // Load user/system config.
        $this->load_config();

		//--------------------------------------------------------------------------------------------------------------
		// Include CSS.
		//--------------------------------------------------------------------------------------------------------------
        $this->include_stylesheet('skin/elastic/darkmode-patches.css');
		if ($rcmail->config->get('strip_inline_backgrounds', false) == true) {
            $this->include_stylesheet('skin/elastic/darkmode-strip-inline-backgrounds.css');
        }

		//--------------------------------------------------------------------------------------------------------------
		// Dark mode for the mail viewer.
		//--------------------------------------------------------------------------------------------------------------
        $this->include_script('darkmode-viewer.js');

		//--------------------------------------------------------------------------------------------------------------
		// Dark mode for the mail editor.
		// When the mail editor is opened, the specific CSS file that TinyMCE should use is taken from this
		// configuration value "editor_css_location" or the default "skins/elastic/styles/embed.min.css".
		// This is done in "program/include/rcmail_action.php" around line 408 in the "html_editor" function.
		// But note that the "skins/elastic" part is automatically prepended the configured value!
		//--------------------------------------------------------------------------------------------------------------
        // 1) Create merged mail editor CSS file if needed.
		$embed_path = RCUBE_INSTALL_PATH . 'skins/elastic/styles/embed.min.css';
        $dark_path   = __DIR__ . '/skin/elastic/darkmode-editor.css';
        $merged_path = __DIR__ . '/skin/elastic/darkmode-editor-all.css';
		if ((is_readable($embed_path) == true) &&
			(is_readable($dark_path) == true) &&
			((file_exists($merged_path) == false) ||
			(filemtime($merged_path) < filemtime($embed_path)) ||
			(filemtime($merged_path) < filemtime($dark_path))
		)) {
			$embed_css = file_get_contents($embed_path);
			$dark_css = file_get_contents($dark_path);
			$combined = $embed_css . "\n\n\n" . $dark_css;
			if (@file_put_contents($merged_path, $combined) === false) {
				$error = error_get_last();
				$message = isset($error['message']) ? $error['message'] : 'Unknown error';
				rcube::write_log('errors', "rpc_rcm_patches: Failed to write merged mail editor CSS file '$merged_path': $message");
			}
		}

		// 2) Configure Roundcube to use the merged mail editor CSS file with TinyMCE.
        $rcmail->config->set('editor_css_location', '/../../plugins/rpc_rcm_patches/skin/elastic/darkmode-editor-all.css');

		// 3) Patch JS.
		// RoundCubeMail adds and removes the 'dark-mode' class on the HTML element, in the application itself, in the
		// mail viewer IFrame and in the mail editor IFrame (TinyMCE), according to whether dark is enabled or not.
		// But this is not automatically done when the editor is initialised, so the following JavaScript code need to
		// be added to "program/js/editor.min.js" just after the "conf" configuration is created.
		if ($rcmail->config->get('auto_patch_editor_min_js', true) == true) {
			$editor_js_backup_path = RCUBE_INSTALL_PATH . 'program/js/editor.min.js.original';
			$editor_js_source_path = RCUBE_INSTALL_PATH . 'program/js/editor.js';
			$editor_js_path = RCUBE_INSTALL_PATH . 'program/js/editor.min.js';
			// A) Backup original file if needed.
			if ((file_exists($editor_js_backup_path) == false) && (file_exists($editor_js_path) == true)) {
				if (@copy($editor_js_path, $editor_js_backup_path) === false) {
					$error = error_get_last();
					$message = isset($error['message']) ? $error['message'] : 'Unknown error';
					rcube::write_log('errors', "rpc_rcm_patches: Failed to copy the JS file '$editor_js_path' -> '$editor_js_backup_path': $message");
				}
			}

			// B) Patch the JS file.
			// TODO: Patch the minified file instead.
			// if($('html').hasClass('dark-mode')){tinymce.on('AddEditor',e=>e.editor.on('init',()=>e.editor.getDoc().documentElement.classList.add('dark-mode')));}
			$editor_search = '// register spellchecker for plain text editor';
			$editor_replace = "/* rpc_rcm_patch */  if ($('html').hasClass('dark-mode') == true) { tinymce.on('AddEditor', e => e.editor.on('init', () => e.editor.getDoc().documentElement.classList.add('dark-mode')));}  \n\n$editor_search";
			$editor_file = file_get_contents($editor_js_path);
			if (str_contains($editor_file, '/* rpc_rcm_patch */') == false) {
				$editor_file = file_get_contents($editor_js_source_path);		// HACK: Patch the un-minicied file.
				$editor_file = str_replace($editor_search, $editor_replace, $editor_file);
				if (@file_put_contents($editor_js_path, $editor_file) === false) {
					$error = error_get_last();
					$message = isset($error['message']) ? $error['message'] : 'Unknown error';
					rcube::write_log('errors', "rpc_rcm_patches: Failed to write the patched JS file '$editor_js_path': $message");
				}
			}
		}

		//--------------------------------------------------------------------------------------------------------------
		// Use the Scandinavian Inter font.
		//--------------------------------------------------------------------------------------------------------------
		if ($rcmail->config->get('use_scandinavian_inter_font', true) == true) {
            $this->include_stylesheet('skin/elastic/scandinavian-inter-font.css');
        }

    } // init

} // rpc_rcm_patches
