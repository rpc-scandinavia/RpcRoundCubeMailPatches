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
	private const CONFIG_INVERT_IMPLEMENTATION = 'invert_implementation';
	private const CONFIG_INVERT_IMPLEMENTATION_FORCE = 'invert_implementation_force';
	private const CONFIG_STRIP_INLINE_BACKGROUNDS = 'strip_inline_backgrounds';
	private const CONFIG_STRIP_INLINE_BACKGROUNDS_FORCE = 'strip_inline_backgrounds_force';
	private const CONFIG_USE_SCANDINAVIAN_INTER_FONT = 'use_scandinavian_inter_font';
	private const CONFIG_USE_SCANDINAVIAN_INTER_FONT_FORCE = 'use_scandinavian_inter_font_force';

	private const PLUGIN_VERSION = '2025.0';
	private const PLUGIN_INFO = [
		'name' => 'rpc_rcm_patches',
		'vendor' => 'RPC Scandinavia',
		'version' => self::PLUGIN_VERSION,
		'license' => 'GPL-3.0',
		'uri' => 'https://github.com/rpc-scandinavia/RpcRoundCubeMailPatches/'
    ];
//    public $task = 'mail';
	private $rcmail;

	public static function info(): array {
		return self::PLUGIN_INFO;
	} // Info

    function init() {
		$this->rcmail = rcmail::get_instance();
        $this->add_texts('localization');
		$this->load_config();
		$this->init_settings();
		$this->init_viewer();
		$this->init_editor();
		$this->init_font();
    } // init

	//------------------------------------------------------------------------------------------------------------------
	// Message viewer.
	//------------------------------------------------------------------------------------------------------------------
	function init_viewer() {
		// Enable dark mode for the message viewer.
		switch ($this->rcmail->config->get(self::CONFIG_INVERT_IMPLEMENTATION, 'classic')) {
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

		// Enable stripping inline backgrounds CSS.
        $this->include_stylesheet('skin/elastic/darkmode-patches.css');
		if ($this->rcmail->config->get(self::CONFIG_STRIP_INLINE_BACKGROUNDS, false) == true) {
            $this->include_stylesheet('skin/elastic/darkmode-strip-inline-backgrounds.css');
        }
	} // init_viewer

	//------------------------------------------------------------------------------------------------------------------
	// Message editor.
	// Dark mode for the mail editor.
	// When the mail editor is opened, the specific CSS file that TinyMCE should use is taken from this configuration
	// value "editor_css_location" or the default "skins/elastic/styles/embed.min.css".
	// This is done in "program/include/rcmail_action.php" around line 408 in the "html_editor" function.
	// But note that the "skins/elastic" part is automatically prepended the configured value!
	//------------------------------------------------------------------------------------------------------------------
	function init_editor() {
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
				$this->rcmail->write_log('errors', "rpc_rcm_patches: Failed to write merged mail editor CSS file '$merged_path': $message");
			}
		}

		// 2) Configure Roundcube to use the merged mail editor CSS file with TinyMCE.
		// But note that the "skins/elastic" part is automatically prepended the configured value, thus "../../"!
        $this->rcmail->config->set('editor_css_location', '/../../plugins/rpc_rcm_patches/skin/elastic/darkmode-editor-all.css');
	} // init_editor

	//------------------------------------------------------------------------------------------------------------------
	// Scandinavian Inter font.
	//------------------------------------------------------------------------------------------------------------------
	function init_font() {
		$userFont = $this->rcmail->config->get(self::CONFIG_USE_SCANDINAVIAN_INTER_FONT, 'yes');
		if (($userFont == 'yes') || ($userFont == "viewer")) {
            $this->include_stylesheet('skin/elastic/scandinavian-inter-font.css');
		}
		if (($userFont == 'yes') || ($userFont == 'editor')) {
			$availableFonts = $this->rcmail->config->get('available_fonts', null);
			if ($availableFonts != null) {
				$availableFonts['Inter'] = 'Inter';
				ksort($availableFonts);
				$this->rcmail->config->set('available_fonts', $availableFonts);
			}
	        $this->rcmail->config->set('default_font', 'Inter');
		}
	} // init_font

	//------------------------------------------------------------------------------------------------------------------
	// User preferences.
	//------------------------------------------------------------------------------------------------------------------
	function init_settings() {
		$this->add_hook('login_after', [$this, 'clean_preferences_hook']);
        $this->add_hook('preferences_list', [$this, 'settings_list_hook']);
        $this->add_hook('preferences_save', [$this, 'settings_save_hook']);
	} // init_settings

	public function clean_preferences_hook($args) {
		// Delete enforced user preferences.
		if ($this->rcmail->config->get(self::CONFIG_INVERT_IMPLEMENTATION_FORCE, false) == true) {
			$this->delete_user_preference(self::CONFIG_INVERT_IMPLEMENTATION);
		}
		if ($this->rcmail->config->get(self::CONFIG_STRIP_INLINE_BACKGROUNDS_FORCE, false) == true) {
			$this->delete_user_preference(self::CONFIG_STRIP_INLINE_BACKGROUNDS);
		}
		if ($this->rcmail->config->get(self::CONFIG_USE_SCANDINAVIAN_INTER_FONT_FORCE, false) == true) {
			$this->delete_user_preference(self::CONFIG_USE_SCANDINAVIAN_INTER_FONT);
		}

		return $args;
	} // clean_preferences_hook

	private function delete_user_preference($pref_name) {
		$prefs = $this->rcmail->user->get_prefs();
		if (isset($prefs[$pref_name])) {
			$prefs[$pref_name] = null;														// Explicitly set to null.
			$result = $this->rcmail->user->save_prefs($prefs, true);
			if ($result) {
				$this->rcmail->user->prefs = $prefs;										// Update in-memory prefs.
				$this->rcmail->write_log('info', "rpc_rcm_patches: Deleted user preference '$pref_name'.");
			} else {
				$error = error_get_last();
				$message = isset($error['message']) ? $error['message'] : 'Unknown error';
				$this->rcmail->write_log('errors', "rpc_rcm_patches: Failed to delete user preference '$pref_name': $message");
			}
		}
	} // delete_user_preference

	public function settings_list_hook($args) {
		if ((($this->rcmail->config->get(self::CONFIG_INVERT_IMPLEMENTATION_FORCE, false) == false) ||
			($this->rcmail->config->get(self::CONFIG_STRIP_INLINE_BACKGROUNDS_FORCE, false) == false) ||
			($this->rcmail->config->get(self::CONFIG_USE_SCANDINAVIAN_INTER_FONT_FORCE, false) == false)) &&
			(isset($args['section']) == true) &&
			($args['section'] == 'mailview')) {
			// Add the plugin's own settings block.
			if (isset($args['blocks']) == false) {
				$args['blocks'] = [];
			}

			$args['blocks']['rpc_rcm_patches'] = [
				'name' => $this->gettext('dark_mode'),
				'options' => [],
			];

			// Add message viewer invert implementation.
			if ($this->rcmail->config->get(self::CONFIG_INVERT_IMPLEMENTATION_FORCE, false) == false) {
				$configInvertImplementation = $this->rcmail->config->get(self::CONFIG_INVERT_IMPLEMENTATION, 'classic');
				$optionInvertImplementation = new html_select(['name' => '_invert_implementation', 'id' => 'invert_implementation', 'class' => 'custom-select']);
				$optionInvertImplementation->add($this->gettext('invert_implementation_classic'), 'classic');
				$optionInvertImplementation->add($this->gettext('invert_implementation_colour'), 'colour');
				$args['blocks']['rpc_rcm_patches']['options'][self::CONFIG_INVERT_IMPLEMENTATION] = [
					'title' => html::label('invert_implementation', $this->gettext('invert_implementation')),
					'content' => $optionInvertImplementation->show($configInvertImplementation),
				];
			}

			// Add message viewer strip inline backgrounds.
			if ($this->rcmail->config->get(self::CONFIG_STRIP_INLINE_BACKGROUNDS_FORCE, false) == false) {
				$configStripInlineBackgrounds = $this->rcmail->config->get(self::CONFIG_STRIP_INLINE_BACKGROUNDS, false);
				$optionStripInlineBackgrounds = new html_checkbox([
					'name' => '_strip_inline_backgrounds',
					'id' => 'strip_inline_backgrounds',
					'value' => ($configStripInlineBackgrounds == true) ? 1 : 0,
				]);
				$args['blocks']['rpc_rcm_patches']['options'][self::CONFIG_STRIP_INLINE_BACKGROUNDS] = [
					'title' => html::label('strip_inline_backgrounds', $this->gettext('strip_inline_backgrounds')),
					'content' => $optionStripInlineBackgrounds->show($configStripInlineBackgrounds),
				];
			}

			// Add Inter font usage selection.
			if ($this->rcmail->config->get(self::CONFIG_USE_SCANDINAVIAN_INTER_FONT_FORCE, false) == false) {
				$configFont = $this->rcmail->config->get(self::CONFIG_USE_SCANDINAVIAN_INTER_FONT, 'yes');
				$optionFont = new html_select(['name' => '_user_scandinavian_inter_font', 'id' => 'user_scandinavian_inter_font', 'class' => 'custom-select']);
				$optionFont->add($this->gettext('use_scandinavian_inter_font_yes'), 'yes');
				$optionFont->add($this->gettext('use_scandinavian_inter_font_viewer'), 'viewer');
				$optionFont->add($this->gettext('use_scandinavian_inter_font_editor'), 'editor');
				$args['blocks']['rpc_rcm_patches']['options'][self::CONFIG_USE_SCANDINAVIAN_INTER_FONT] = [
					'title' =>  html::label('user_scandinavian_inter_font', $this->gettext('use_scandinavian_inter_font')),
					'content' => $optionFont->show($configFont),
				];
			}
		}

		return $args;
	} // settings_list_hook

	public function settings_save_hook($args) {
		if ((isset($args['section']) == true) && ($args['section'] == 'mailview')) {
			if ($this->rcmail->config->get(self::CONFIG_INVERT_IMPLEMENTATION_FORCE, false) == false) {
				$args['prefs'][self::CONFIG_INVERT_IMPLEMENTATION] = rcube_utils::get_input_string('_invert_implementation', rcube_utils::INPUT_POST);
			} else {
				unset($args['prefs'][self::CONFIG_INVERT_IMPLEMENTATION]);
			}

			if ($this->rcmail->config->get(self::CONFIG_STRIP_INLINE_BACKGROUNDS_FORCE, false) == false) {
				$args['prefs'][self::CONFIG_STRIP_INLINE_BACKGROUNDS] = (rcube_utils::get_input_string('_strip_inline_backgrounds', rcube_utils::INPUT_POST) != '') ? true : false;
			} else {
				unset($args['prefs'][self::CONFIG_STRIP_INLINE_BACKGROUNDS]);
			}

			if ($this->rcmail->config->get(self::CONFIG_USE_SCANDINAVIAN_INTER_FONT_FORCE, false) == false) {
				$args['prefs'][self::CONFIG_USE_SCANDINAVIAN_INTER_FONT] = rcube_utils::get_input_string('_user_scandinavian_inter_font', rcube_utils::INPUT_POST);
			} else {
				unset($args['prefs'][self::CONFIG_USE_SCANDINAVIAN_INTER_FONT]);
			}
        }

        return $args;
	} // settings_save_hook

} // rpc_rcm_patches
