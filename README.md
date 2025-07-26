# RPC RoundCubeMail Patches
This plugin for RoundCubeMail version 1.7, patches dark mode for the mail editor and the mail viewer.

It also includes a customized version of the Inter font made by Rasmus Andersson from Scandinavia, released under SIL Open Font License version 1.1.\
https://github.com/rsms/inter/  and  https://rsms.me/inter/

It extends the mail editor dark mode work done by Dhiego Cassiano Fogaça Barbosa, which is released under Apache License version 2.0.\
https://github.com/modscleo4/roundcube-plugin-dark-html

## Prerequisites
This plugin assumes that RCM adds and removes the `dark-mode` class on the `html` element, specifying whether **dark mode** is enabled or not:

* For the web program itself
* For the mail viewer `iframe`
* For the mail viewer `window` or `tab`
* For the mail editor `iframe` (TinyMCE)

## Mail viewer

### Known bugs
Minor: Sometimes there is a white flash when a mail is selected. I haven't been able to find the **css** that causes this.

## Mail editor (TinyMCE)
RCM does not set the `dark-mode` class on the `html` element when the mail editor is created/initialised, the plugin fixes that.

RCM does however set the `dark-mode` class on the `html` element when the user toggles between **dark** and **light** mode.

### Fix **css**
The message editor **css** is fixed by creating a new **css** file containing the existing **css** from `skins/elastic/styles/embed.min.css` and some additional **css**. The RCM configuration setting `editor_css_location` is set with the path to the new combined **css** file, which causes RCM to use that file when it initialises the mail editor (TinyMCE).

### Known bugs
Minor: Not all the **css** is minified.

## File permissions
Because files are written, the following file permissions are required:

```sh
chmod  u+w  plugins/rpc_rcm_patches/skin/elastic
```

René Paw Christensen\
https://rpc-scandinavia.dk/
