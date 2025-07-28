<?php
// ┌────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
// │  SCRIPT: plugins/rpc_rcm_patches/rpc_rcm_patches.php                                                               │
// │ VERSION: 2025-07-25 Initial version for RCM version 1.7.                                                           │
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
	private const PLUGIN_VERSION = '2025.0';
	private const PLUGIN_INFO = [
		'name' => 'rpc_rcm_patches',
		'vendor' => 'RPC Scandinavia',
		'version' => self::PLUGIN_VERSION,
		'license' => 'GPL-3.0',
		'uri' => 'https://github.com/rpc-scandinavia/RpcRoundCubeMailPatches/'
    ];
    public $task = 'mail';

	public static function info(): array {
		return self::PLUGIN_INFO;
	} // Info

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
		switch ($rcmail->config->get('invert_implementation', '')) {
			case 'test':
        		$this->include_script('darkmode-viewer-test.js');
        		break;
			case 'color':
			case 'colour':
        		$this->include_script('darkmode-viewer-colour.js');
        		break;
			case 'classic':
			default:
        		$this->include_script('darkmode-viewer-classic.js');
        		break;
		}

		//--------------------------------------------------------------------------------------------------------------
		// Dark mode for the mail editor.
		// When the mail editor is opened, the specific CSS file that TinyMCE should use is taken from this
		// configuration value "editor_css_location" or the default "skins/elastic/styles/embed.min.css".
		// This is done in "program/include/rcmail_action.php" around line 408 in the "html_editor" function.
		// But note that the "skins/elastic" part is automatically prepended the configured value!
		//--------------------------------------------------------------------------------------------------------------
        // 1) Create merged mail editor CSS file if needed.
		$embed_path = RCUBE_INSTALL_PATH . 'skins/elastic/styles/embed.min.css';
        $dark_path = __DIR__ . '/skin/elastic/darkmode-editor.css';
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

		//--------------------------------------------------------------------------------------------------------------
		// Use the Scandinavian Inter font.
		//--------------------------------------------------------------------------------------------------------------
		$userFont = $rcmail->config->get('use_scandinavian_inter_font', 'yes');
		if (($userFont == 'yes') || ($userFont == "viewer")) {
            $this->include_stylesheet('skin/elastic/scandinavian-inter-font.css');
		}
		if (($userFont == 'yes') || ($userFont == 'editor')) {
			$availableFonts = $rcmail->config->get('available_fonts', null);
			if ($availableFonts != null) {
				$availableFonts['Inter'] = 'Inter';
				ksort($availableFonts);
				$rcmail->config->set('available_fonts', $availableFonts);
			}
	        $rcmail->config->set('default_font', 'Inter');
		}

    } // init

} // rpc_rcm_patches
