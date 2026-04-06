//----------------------------------------------------------------------------------------------------------------------
// Try to prevent white flash.
// This is a little hack, it hides the "message-content" element until the message inversion has been performed.
// This is restored in "ns.setMode".
//----------------------------------------------------------------------------------------------------------------------
window.addEventListener("DOMContentLoaded", function () {
	const viewerContent = window.document.getElementById("message-content");
	if (viewerContent) {
		viewerContent.style.display = "none";
	}
}, { capture: true, passive: true })



// Ensure the namespace exists.
window.rpc_rcm_patches = window.rpc_rcm_patches || {};

(function(ns) {
	ns.LOG_TO_CONSOLE = false;
	ns.TASK_MAIL = "task-mail";
	ns.ACTION_NONE = "action-none";
	ns.ACTION_SHOW = "action-show";
	ns.ACTION_PREVIEW = "action-preview";
	ns.ACTION_COMPOSE = "action-compose";

	//------------------------------------------------------------------------------------------------------------------
	// Helper functions.
	//------------------------------------------------------------------------------------------------------------------
	ns.setState = function(key, value) {
		if ((window.rcmail === undefined) || (window.rcmail.env === undefined)) {
			return;
		}

		var envKey = "plugin_rpc_rcm_patches_" + key;
		window.rcmail.env[envKey] = value;

		// Optional: also sync to a hidden input if you need it sent back to PHP later.
		// window.rcmail.set_env(envKey, value);  // this also works
    }; // setState

	ns.getState = function(key, defaultValue) {
		if ((window.rcmail === undefined) || (window.rcmail.env === undefined)) {
			return;
		}

		var envKey = "plugin_rpc_rcm_patches_" + key;
		return (window.rcmail.env[envKey] !== undefined) ? window.rcmail.env[envKey] : defaultValue;
    }; // getState

	ns.setModeOverride = function(setModeOverrideOn) {
		ns.setState("viewerOverride", setModeOverrideOn);
    }; // setModeOverride

	ns.setButtonVisibility = function(command, visible) {
		if (window.rcmail) {
			var selector = 'a[onclick*="' + command + '"]';
			var $buttons = $(selector);

			if (visible) {
				$buttons.removeClass("hidden");
				$buttons.closest('li[role="menuitem"]').removeClass("hidden");					// important for Elastic.
			} else {
				$buttons.addClass("hidden");
				$buttons.closest('li[role="menuitem"]').addClass("hidden");						// important for Elastic.
			}
		}
	}; // setButtonVisibility

	//------------------------------------------------------------------------------------------------------------------
	// Worker functions.
	//------------------------------------------------------------------------------------------------------------------
	ns.setMode = function(appAction) {
		var ns = window.rpc_rcm_patches;

		// The message is shown in the IFrame.
		// Add or remove the "dark-mode" class from the HTML element in the IFrame.
		if (appAction === ns.ACTION_NONE) {
			var viewerOverride = ns.getState("viewerOverride", false);

			let appIsDark = window.document.documentElement.classList.contains("dark-mode");

			let viewerIframe = window.document.getElementById("messagecontframe");
			let viewerDocument = viewerIframe.contentWindow.document;
			let viewerHtmlElement = viewerDocument.querySelector("html");
			let viewerMessageBodyElement = viewerDocument.querySelector("#messagebody");

			if (viewerMessageBodyElement !== null) {
				if (
					(appIsDark === true) &&								// The application must be in dark mode.
					(viewerOverride == false)							// The message viewer is not forced to be in light mode.
				) {
					// Set dark mode.
					viewerHtmlElement.classList.add("dark-mode");
					ns.setState("viewerOverride", false);

					// Log.
					if (ns.LOG_TO_CONSOLE === true) {
						console.debug(`${appAction} - setMode:  DARK in 'dark-mode'`);
					}
				} else {
					// Set light mode.
					viewerHtmlElement.classList.remove("dark-mode");
					ns.setState("viewerOverride", true);

					// Log.
					if (ns.LOG_TO_CONSOLE === true) {
						console.debug(`${appAction} - setMode:  LIGHT in 'dark-mode'`);
					}
				}
			}
		}



		// The message is shown in the IFrame.
		if (appAction === ns.ACTION_PREVIEW) {
			var viewerInverted = ns.getState("viewerInverted", false);
			var viewerOverride = ns.getState("viewerOverride", false);

			let appIsDark = window.document.documentElement.classList.contains("dark-mode");
			let viewerMessageBodyElement = window.document.querySelector("#messagebody");

			if (
				(appIsDark === true) &&								// The application must be in dark mode.
				(viewerMessageBodyElement !== null) &&				// A message must be loaded in the viewer.
				(viewerOverride == false)							// The message viewer is not forced to be in light mode.
			) {
				// Set dark mode.
				if (viewerInverted === false) {
					// Log.
					if (ns.LOG_TO_CONSOLE === true) {
						console.debug(`${appAction} - setMode:  DARK`);
					}

					ns.invert(viewerMessageBodyElement);
					ns.setState("viewerInverted", true);
				}
			} else {
				// Set light mode.
				if (viewerInverted === true) {
					// Log.
					if (ns.LOG_TO_CONSOLE === true) {
						console.debug(`${appAction} - setMode:  LIGHT`);
					}

					ns.revert(viewerMessageBodyElement);
					ns.setState("viewerInverted", false);
				}
			}

			// Try to prevent white flash.
			// The IFrame was hidden to prevent the white flash, show it now.
			if (window.document.body.parentElement) {
				window.document.body.parentElement.style.display = "inline";
			}

			// Try to prevent white flash.
			// The "message-content" element was hidden to prevent the white flash, show it now.
			const viewerContent = window.document.getElementById("message-content");
			if (viewerContent) {
				viewerContent.style.display = "inline";
			}
		}



		// The message is shown in a window.
		if (appAction === ns.ACTION_SHOW) {
			var viewerInverted = ns.getState("viewerInverted", false);
			var viewerOverride = ns.getState("viewerOverride", false);

			let appIsDark = window.document.documentElement.classList.contains("dark-mode");
			let viewerMessageBodyElement = window.document.querySelector("#messagebody");

			if (
				(viewerMessageBodyElement !== null) &&				// A message must be loaded in the viewer.
				(viewerOverride == false)							// The message viewer is not forced to be in light mode.
			) {
				// Set dark mode.
				window.document.documentElement.classList.add("dark-mode");

				if (viewerInverted === false) {
					// Log.
					if (ns.LOG_TO_CONSOLE === true) {
						console.debug(`${appAction} - setMode:  DARK`);
					}

					ns.invert(viewerMessageBodyElement);
					ns.setState("viewerInverted", true);
				}
			} else {
				// Set light mode.
				window.document.documentElement.classList.remove("dark-mode");

				if (viewerInverted === true) {
					// Log.
					if (ns.LOG_TO_CONSOLE === true) {
						console.debug(`${appAction} - setMode:  LIGHT`);
					}

					ns.revert(viewerMessageBodyElement);
					ns.setState("viewerInverted", false);
				}
			}

			// Try to prevent white flash.
			// The "message-content" element was hidden to prevent the white flash, show it now.
			const viewerContent = window.document.getElementById("message-content");
			if (viewerContent) {
				viewerContent.style.display = "inline";
			}
		}
	} // setMode

	ns.setButtons = function(appAction) {
		if (window.rcmail) {
			let ns = window.rpc_rcm_patches;

			// The message is shown in the IFrame, but the buttons are in the application.
//			if ((appAction === ns.ACTION_NONE) || (appAction === ns.ACTION_PREVIEW)) {
			if (appAction === ns.ACTION_NONE) {
				let viewerInverted = ns.getState("viewerInverted", false);
//				var viewerOverride = ns.getState("viewerOverride", false);

				let appIsDark = window.document.documentElement.classList.contains("dark-mode");

				let viewerIframe = window.document.getElementById("messagecontframe");
//				let viewerDocument = (viewerIframe) ? viewerIframe.contentWindow.document : document;
				let viewerDocument = viewerIframe.contentWindow.document;
				let viewerHtmlElement = viewerDocument.querySelector("html");
				let viewerIsDark = viewerHtmlElement.classList.contains("dark-mode");
				let viewerMessageBodyElement = viewerDocument.querySelector("#messagebody");

//				let enableDark = ((appIsDark == true) && (viewerIsDark === false) && (viewerInverted === false) && (viewerMessageBodyElement !== null));
//				let enableLight = ((appIsDark == true) && (viewerIsDark === true) && (viewerInverted === true) && (viewerMessageBodyElement !== null));
				let enableDark = ((appIsDark == true) && (viewerIsDark === false) && (viewerMessageBodyElement !== null));
				let enableLight = ((appIsDark == true) && (viewerIsDark === true) && (viewerMessageBodyElement !== null));

				// Log.
				if (ns.LOG_TO_CONSOLE === true) {
					console.debug(`${appAction} - setButtons.  Dark: ${enableDark}.  Light: ${enableLight}.  App is dark: ${appIsDark}.  Viewer is dark: ${viewerIsDark}.  Viewer is inverted: ${viewerInverted}`);
				}

				window.rcmail.enable_command("plugin.rpc_rcm_patches.viewer_dark", enableDark);
				window.rcmail.enable_command("plugin.rpc_rcm_patches.viewer_light", enableLight);

				ns.setButtonVisibility("plugin.rpc_rcm_patches.viewer_dark", enableDark);
				ns.setButtonVisibility("plugin.rpc_rcm_patches.viewer_light", enableLight);
			}

			if (appAction === ns.ACTION_SHOW) {
				let viewerInverted = ns.getState("viewerInverted", false);

				let enableDark = (viewerInverted === false);
				let enableLight = (viewerInverted === true);

				// Log.
				if (ns.LOG_TO_CONSOLE === true) {
					console.debug(`${appAction} - setButtons.  Dark: ${enableDark}.  Light: ${enableLight}`);
				}

				window.rcmail.enable_command("plugin.rpc_rcm_patches.viewer_dark", enableDark);
				window.rcmail.enable_command("plugin.rpc_rcm_patches.viewer_light", enableLight);

				ns.setButtonVisibility("plugin.rpc_rcm_patches.viewer_dark", enableDark);
				ns.setButtonVisibility("plugin.rpc_rcm_patches.viewer_light", enableLight);
			}
		}
	} // setButtons

})(window.rpc_rcm_patches);


//----------------------------------------------------------------------------------------------------------------------
// Initialisation.
//----------------------------------------------------------------------------------------------------------------------
if (window.rcmail) {

	//------------------------------------------------------------------------------------------------------------------
	// Mail editor.
	// This plugin assumes that RCM adds and removes the "dark-mode" class on the "html" element, specifying whether
	// dark mode is enabled or not. But RCM does not set the "dark-mode" class on the "html" element when the mail
	// editor is created/initialised, RCM does however set the "dark-mode" class on the "html" element when the user
	// toggles between dark and light mode.
	//
	// Because the web page is reloaded when the user opens the mail editor to compose a new message, there is no
	// need to listen/observe anything, just check if TinyMCE is there, and set the class if needed in a TinyMCE "init" event.
	//------------------------------------------------------------------------------------------------------------------
	if ((window.tinyMCE != null) && (window.document.documentElement.classList.contains("dark-mode")) === true) {
		window.tinyMCE.on("AddEditor", (element) => element.editor.on("init", () => element.editor.getDoc().documentElement.classList.add("dark-mode")));
	}



	//------------------------------------------------------------------------------------------------------------------
	// Mail viewer.
	//------------------------------------------------------------------------------------------------------------------
    window.rcmail.addEventListener("init", function(event) {
		// RCM can run in these mail action modes:
		//	none		The main application.
		//	show		The message viewer in a window.
		//	preview		The message viewer in an IFrame.
		//	compose		The message editor.
		// Get the mail action mode from the "body" element.
		const ns = window.rpc_rcm_patches;
		const appActionClassList = window.document.body.classList;
		let appAction = "";
		if ((appActionClassList.contains(ns.TASK_MAIL) === true) && (appActionClassList.contains(ns.ACTION_NONE) === true)) {
			appAction = ns.ACTION_NONE;
		}
		if ((appActionClassList.contains(ns.TASK_MAIL) === true) && (appActionClassList.contains(ns.ACTION_SHOW) === true)) {
			appAction = ns.ACTION_SHOW;
		}
		if ((appActionClassList.contains(ns.TASK_MAIL) === true) && (appActionClassList.contains(ns.ACTION_PREVIEW) === true)) {
			appAction = ns.ACTION_PREVIEW;
		}
		if ((appActionClassList.contains(ns.TASK_MAIL) === true) && (appActionClassList.contains(ns.ACTION_COMPOSE) === true)) {
			appAction = ns.ACTION_COMPOSE;
		}

		// Get the initial dark mode from the "html" element.
		const appDarkModeWhenLoaded = window.document.documentElement.classList.contains("dark-mode");

		// Get the message viewer IFrame element.
		const viewerIframe = window.document.getElementById("messagecontframe");

		// Log.
		if (ns.LOG_TO_CONSOLE === true) {
			console.debug(`--------------------------------------------------`);
			console.debug(`          Action: ${appAction}`);
			console.debug(`Dark when loaded: ${appDarkModeWhenLoaded}`);
			console.debug(`   Viewer IFrame: ${viewerIframe}`);
			console.debug(`--------------------------------------------------`);
		}

		//--------------------------------------------------------------------------------------------------------------
		// Initialise the message viewer with the current application state.
		//--------------------------------------------------------------------------------------------------------------
		if ((appAction === ns.ACTION_PREVIEW) || (appAction === ns.ACTION_SHOW)) {
			ns.setMode(appAction);
			ns.setButtons(appAction);
		}

		// The message is shown in the IFrame, but the buttons are in the application.
		if (appAction === ns.ACTION_NONE) {
			ns.setButtons(appAction);
		}

		//--------------------------------------------------------------------------------------------------------------
		// Try to prevent white flash.
		// This is a little hack, it hides the IFrame until the message inversion has been performed.
		// This obviously only works for messages shown in the viewer and not in a window.
		// The IFrame element is "automatically" shown somewhere else in RCM code, but is also restored in "ns.setMode".
		//--------------------------------------------------------------------------------------------------------------
		if (appAction === ns.ACTION_NONE) {
			if (window.rcmail.message_list) {
				window.rcmail.message_list.addEventListener('select', function (list) {
					let selectCount = list.get_selection(false).length;

					// Log.
					if (ns.LOG_TO_CONSOLE === true) {
						console.debug(`${appAction} - EVENT: Message list selection changed. ${selectCount} selected.`);
					}

					let appIsDark = window.document.documentElement.classList.contains("dark-mode");
					if ((appIsDark === true) && (selectCount === 1)) {
						viewerIframe.style.display = "none";
					}
				});
			}
		}

		//--------------------------------------------------------------------------------------------------------------
		// Observe when the "dark-mode" class is added or removed from the HTML element, and update the mode and buttons.
		//--------------------------------------------------------------------------------------------------------------
		if ((appAction === ns.ACTION_NONE) || (appAction === ns.ACTION_PREVIEW)) {
			const htmlObserver = new MutationObserver((mutationsList) => {
				const wasDark = mutationsList.some((mutationRecord) => mutationRecord.oldValue?.includes("dark-mode"));
				const isNowDark = window.document.documentElement.classList.contains("dark-mode");
				if (wasDark !== isNowDark) {
					// Log.
					if (ns.LOG_TO_CONSOLE === true) {
						console.debug(`${appAction} - EVENT: Application mode was changed. Dark:  ${isNowDark}`);
					}

					// The message is shown in the IFrame, but the buttons are in the application.
					if (appAction === ns.ACTION_PREVIEW) {
						ns.setMode(appAction);
					}

					// The message is shown in the IFrame, but the buttons are in the application.
					if (appAction === ns.ACTION_NONE) {
						ns.setButtons(appAction);
					}
				}
			});

			htmlObserver.observe(window.document.documentElement, {
				attributes: true,
				attributeFilter: ["class"],
				attributeOldValue: true
			});
		}

		//--------------------------------------------------------------------------------------------------------------
        // Enable toggle dark/light mode in the message viewer, triggered by by button in the message toolbar.
		//--------------------------------------------------------------------------------------------------------------
		if ((appAction === ns.ACTION_NONE) || (appAction === ns.ACTION_SHOW)) {
			window.rcmail.register_command("plugin.rpc_rcm_patches.viewer_dark", function() {
				// Log.
				if (ns.LOG_TO_CONSOLE === true) {
					console.debug(`${appAction} - EVENT: Button 'Dark' clicked`);
				}

				ns.setModeOverride(false);
				ns.setMode(appAction);
				ns.setButtons(appAction);
			}, false);

			window.rcmail.register_command("plugin.rpc_rcm_patches.viewer_light", function() {
				// Log.
				if (ns.LOG_TO_CONSOLE === true) {
					console.debug(`${appAction} - EVENT: Button 'Light' clicked`);
				}

				ns.setModeOverride(true);
				ns.setMode(appAction);
				ns.setButtons(appAction);
			}, false);
		}

		//--------------------------------------------------------------------------------------------------------------
		// Observe when the message viewer IFrame is loaded, and update the mode and buttons.
		//--------------------------------------------------------------------------------------------------------------
		if ((appAction === ns.ACTION_NONE) && (viewerIframe !== null)) {
			viewerIframe.addEventListener("load", function(event) {
				// Log.
				if (ns.LOG_TO_CONSOLE === true) {
					console.debug(`${appAction} - EVENT: IFrame was loaded`);
				}

				ns.setButtons(appAction);
			});
		}

	}); // "init" event listener

}
