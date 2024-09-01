import Adw from 'gi://Adw';
import Gdk from 'gi://Gdk';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';

import * as Config from 'resource:///org/gnome/Shell/Extensions/js/misc/config.js';

import {ExtensionPreferences, gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

var GeneralPage = GObject.registerClass(
class IPFinderGeneralPage extends Adw.PreferencesPage {
    _init(settings) {
        super._init({
            title: _('General'),
            icon_name: 'preferences-system-symbolic',
            name: 'GeneralPage',
        });

        this._settings = settings;

        const generalGroup = new Adw.PreferencesGroup({
            title: _('General'),
        });
        this.add(generalGroup);

        const actorsInPanelList = new Gtk.StringList();
        actorsInPanelList.append(_('IP Address and Flag'));
        actorsInPanelList.append(_('Flag'));
        actorsInPanelList.append(_('IP Address'));
        const actorsInPanelMenu = new Gtk.DropDown({
            valign: Gtk.Align.CENTER,
            model: actorsInPanelList,
            selected: this._settings.get_enum('actors-in-panel'),
        });
        const actorsInPanelRow = new Adw.ActionRow({
            title: _('Elements to show on the Panel'),
            activatable_widget: actorsInPanelMenu,
        });
        actorsInPanelRow.add_suffix(actorsInPanelMenu);
        actorsInPanelMenu.connect('notify::selected', widget => {
            this._settings.set_enum('actors-in-panel', widget.selected);
        });
        generalGroup.add(actorsInPanelRow);

        const panelPositions = new Gtk.StringList();
        panelPositions.append(_('Left'));
        panelPositions.append(_('Center'));
        panelPositions.append(_('Right'));
        const panelPositionRow = new Adw.ComboRow({
            title: _('Position in Panel'),
            model: panelPositions,
            selected: this._settings.get_enum('position-in-panel'),
        });
        panelPositionRow.connect('notify::selected', widget => {
            this._settings.set_enum('position-in-panel', widget.selected);
        });
        generalGroup.add(panelPositionRow);

        const tileZoomSpinButton = new Gtk.SpinButton({
            adjustment: new Gtk.Adjustment({
                lower: 7,
                upper: 13,
                step_increment: 1,
            }),
            climb_rate: 1,
            digits: 0,
            numeric: true,
            valign: Gtk.Align.CENTER,
            value: this._settings.get_int('tile-zoom'),
        });
        tileZoomSpinButton.connect('notify::value', widget => {
            this._settings.set_int('tile-zoom', widget.get_value());
        });

        const tileZoomRow = new Adw.ActionRow({
            title: _('Map Tile Zoom Factor'),
            activatable_widget: tileZoomSpinButton,
        });
        tileZoomRow.add_suffix(tileZoomSpinButton);
        generalGroup.add(tileZoomRow);

        const apiList = new Gtk.StringList();
        apiList.append(_('ipinfo.io'));
        apiList.append(_('ip-api.com'));
        const apiMenu = new Gtk.DropDown({
            valign: Gtk.Align.CENTER,
            model: apiList,
            selected: this._settings.get_enum('api-service'),
        });
        const apiRow = new Adw.ActionRow({
            title: _('API Service'),
            activatable_widget: apiMenu,
        });
        apiRow.add_suffix(apiMenu);
        apiMenu.connect('notify::selected', widget => {
            this._settings.set_enum('api-service', widget.selected);
        });
        generalGroup.add(apiRow);

        const vpnGroup = new Adw.PreferencesGroup({
            title: _('VPN Status'),
        });
        this.add(vpnGroup);

        const showVPNStatusRow = new Adw.ExpanderRow({
            title: _('Show VPN Status'),
            subtitle: _('Attempts to display VPN status. Works best when connecting VPN through GNOME'),
            show_enable_switch: true,
            enable_expansion: this._settings.get_boolean('vpn-status'),
        });
        vpnGroup.add(showVPNStatusRow);

        showVPNStatusRow.connect('notify::enable-expansion', widget => {
            this._settings.set_boolean('vpn-status', widget.enable_expansion);
        });

        const vpnWidgetsList = new Gtk.StringList();
        vpnWidgetsList.append(_('Icon on Panel + Text in Menu'));
        vpnWidgetsList.append(_('Icon on Panel'));
        vpnWidgetsList.append(_('Text in Menu'));
        const vpnWidgetsMenu = new Gtk.DropDown({
            valign: Gtk.Align.CENTER,
            model: vpnWidgetsList,
            selected: this._settings.get_enum('vpn-widgets'),
        });
        const vpnWidgetsRow = new Adw.ActionRow({
            title: _('VPN status display options'),
            activatable_widget: vpnWidgetsMenu,
        });
        vpnWidgetsRow.add_suffix(vpnWidgetsMenu);
        vpnWidgetsMenu.connect('notify::selected', widget => {
            this._settings.set_enum('vpn-widgets', widget.selected);
        });
        showVPNStatusRow.add_row(vpnWidgetsRow);

        const showVPNOnlyWhenOnSwitch = new Gtk.Switch({
            active: this._settings.get_boolean('vpn-status-only-when-on'),
            valign: Gtk.Align.CENTER,
        });
        showVPNOnlyWhenOnSwitch.connect('notify::active', widget => {
            this._settings.set_boolean('vpn-status-only-when-on', widget.get_active());
        });
        const showVPNOnlyWhenOnRow = new Adw.ActionRow({
            title: _('Only show VPN status when VPN detected'),
            activatable_widget: showVPNOnlyWhenOnSwitch,
        });
        showVPNOnlyWhenOnRow.add_suffix(showVPNOnlyWhenOnSwitch);
        showVPNStatusRow.add_row(showVPNOnlyWhenOnRow);

        const vpnIconColorSwitch = new Gtk.Switch({
            active: this._settings.get_boolean('vpn-icon-color'),
            valign: Gtk.Align.CENTER,
        });
        vpnIconColorSwitch.connect('notify::active', widget => {
            this._settings.set_boolean('vpn-icon-color', widget.get_active());
        });
        const vpnIconColorRow = new Adw.ActionRow({
            title: _('Colorize VPN Icon based on VPN status'),
            activatable_widget: vpnIconColorSwitch,
        });
        vpnIconColorRow.add_suffix(vpnIconColorSwitch);
        showVPNStatusRow.add_row(vpnIconColorRow);

        const vpnAddressColorSwitch = new Gtk.Switch({
            active: this._settings.get_boolean('vpn-ip-address-color'),
            valign: Gtk.Align.CENTER,
        });
        vpnAddressColorSwitch.connect('notify::active', widget => {
            this._settings.set_boolean('vpn-ip-address-color', widget.get_active());
        });
        const vpnAddressColorRow = new Adw.ActionRow({
            title: _('Colorize IP Address based on VPN status'),
            activatable_widget: vpnAddressColorSwitch,
        });
        vpnAddressColorRow.add_suffix(vpnAddressColorSwitch);
        showVPNStatusRow.add_row(vpnAddressColorRow);

        // VPN Types---------------------------------------------------------
        const restoreVpnTypesButton = new Gtk.Button({
            icon_name: 'view-refresh-symbolic',
            tooltip_text: _('Reset VPN Connection Types'),
            css_classes: ['destructive-action'],
            valign: Gtk.Align.START,
        });
        restoreVpnTypesButton.connect('clicked', () => {
            const dialog = new Gtk.MessageDialog({
                text: `<b>${_('Reset VPN Connection Types?')}</b>`,
                secondary_text: _('All VPN Connection Types will be reset to the default value.'),
                use_markup: true,
                buttons: Gtk.ButtonsType.YES_NO,
                message_type: Gtk.MessageType.WARNING,
                transient_for: this.get_root(),
                modal: true,
            });
            dialog.connect('response', (widget, response) => {
                if (response === Gtk.ResponseType.YES) {
                    for (let i = 0; i < this.vpnTypesExpanderRow._rows.length; i++) {
                        const row = this.vpnTypesExpanderRow._rows[i];
                        this.vpnTypesExpanderRow.remove(row);
                    }

                    this.vpnTypesExpanderRow._rows = [];

                    const defaultVpnTypes = this._settings.get_default_value('vpn-connection-types').deep_unpack();
                    this._settings.set_strv('vpn-connection-types', defaultVpnTypes);
                    const vpnConnectionTypes = this._settings.get_strv('vpn-connection-types');

                    for (let i = 0; i < vpnConnectionTypes.length; i++)
                        this._addVpnConnectionType(vpnConnectionTypes[i]);
                }
                dialog.destroy();
            });
            dialog.show();
        });

        const vpnTypesGroup = new Adw.PreferencesGroup({
            title: _('VPN Connection Types'),
            description: _('Connection types to be recognized as a VPN'),
            header_suffix: restoreVpnTypesButton,
        });
        this.add(vpnTypesGroup);

        const addToVpnTypesEntry = new Gtk.Entry({
            valign: Gtk.Align.CENTER,
        });

        const addToVpnTypesButton = new Gtk.Button({
            label: _('Add'),
            valign: Gtk.Align.CENTER,
        });
        addToVpnTypesButton.connect('clicked', () => {
            const connectionType = addToVpnTypesEntry.text;
            if (!connectionType || !connectionType.length > 0)
                return;

            this.vpnTypesExpanderRow.expanded = true;

            this._addVpnConnectionType(connectionType);

            const connectionTypes = this._settings.get_strv('vpn-connection-types');
            connectionTypes.push(connectionType);

            this._settings.set_strv('vpn-connection-types', connectionTypes);
        });
        const addToVpnTypesRow = new Adw.ActionRow({
            title: _('Add new VPN Connection Type'),
        });
        addToVpnTypesRow.add_suffix(addToVpnTypesEntry);
        addToVpnTypesRow.add_suffix(addToVpnTypesButton);

        this.vpnTypesExpanderRow = new Adw.ExpanderRow({
            title: _('VPN Connection Types'),
        });
        this.vpnTypesExpanderRow._rows = [];

        const vpnConnectionTypes = this._settings.get_strv('vpn-connection-types');

        for (let i = 0; i < vpnConnectionTypes.length; i++)
            this._addVpnConnectionType(vpnConnectionTypes[i]);


        vpnTypesGroup.add(addToVpnTypesRow);
        vpnTypesGroup.add(this.vpnTypesExpanderRow);
        // ------------------------------------------------------------------

        // White List--------------------------------------------------------
        const whiteListGroup = new Adw.PreferencesGroup({
            title: _('Whitelisted Connections'),
            description: _('Force a connection to be recognized as a VPN'),
        });
        this.add(whiteListGroup);

        this.currentConnectionsMenu = new Gtk.DropDown({
            valign: Gtk.Align.CENTER,
            halign: Gtk.Align.FILL,
        });

        this._settings.connect('changed::current-connection-ids', () => {
            this._populateCurrentConnectionsMenu();
        });
        this._populateCurrentConnectionsMenu();

        const addtoWhiteListButton = new Gtk.Button({
            label: _('Add'),
            valign: Gtk.Align.CENTER,
        });
        addtoWhiteListButton.connect('clicked', () => {
            this.whiteListExpanderRow.expanded = true;
            const selectedConnection = this.currentConnectionsMenu.get_selected_item();
            const connectionId = selectedConnection.string;

            this._addConnectionToWhitelist(connectionId);

            const whitelist = this._settings.get_strv('vpn-connections-whitelist');
            whitelist.push(connectionId);

            this._settings.set_strv('vpn-connections-whitelist', whitelist);
        });
        const addToWhiteListRow = new Adw.ActionRow({
            title: _('Choose a connection to add to VPN Whitelist'),
            activatable_widget: addtoWhiteListButton,
        });
        addToWhiteListRow.add_suffix(this.currentConnectionsMenu);
        addToWhiteListRow.add_suffix(addtoWhiteListButton);

        this.whiteListExpanderRow = new Adw.ExpanderRow({
            title: _('Whitelisted VPN Connections'),
        });

        const whiteList = this._settings.get_strv('vpn-connections-whitelist');

        for (let i = 0; i < whiteList.length; i++)
            this._addConnectionToWhitelist(whiteList[i]);


        whiteListGroup.add(addToWhiteListRow);
        whiteListGroup.add(this.whiteListExpanderRow);
        // ------------------------------------------------------------------
    }

    _populateCurrentConnectionsMenu() {
        const currentConnectionsList = new Gtk.StringList();
        const currentConnectionIds = this._settings.get_strv('current-connection-ids');

        for (let i = 0; i < currentConnectionIds.length; i++)
            currentConnectionsList.append(currentConnectionIds[i]);

        this.currentConnectionsMenu.model = currentConnectionsList;
    }

    _addConnectionToWhitelist(title) {
        const deleteEntry = new Gtk.Button({
            label: _('Delete'),
            valign: Gtk.Align.CENTER,
        });
        deleteEntry.connect('clicked', () => {
            this.whiteListExpanderRow.remove(connectionRow);

            const whitelist = this._settings.get_strv('vpn-connections-whitelist');
            const index = whitelist.indexOf(title);
            whitelist.splice(index, 1);

            this._settings.set_strv('vpn-connections-whitelist', whitelist);
        });
        const connectionRow = new Adw.ActionRow({
            title,
            activatable_widget: deleteEntry,
        });
        connectionRow.add_suffix(deleteEntry);
        this.whiteListExpanderRow.add_row(connectionRow);
    }

    _addVpnConnectionType(title) {
        const deleteEntry = new Gtk.Button({
            label: _('Delete'),
            valign: Gtk.Align.CENTER,
        });
        deleteEntry.connect('clicked', () => {
            this.vpnTypesExpanderRow.remove(connectionRow);

            let index = this.vpnTypesExpanderRow._rows.indexOf(connectionRow);
            this.vpnTypesExpanderRow._rows.splice(index, 1);

            const connectionTypes = this._settings.get_strv('vpn-connection-types');
            index = connectionTypes.indexOf(title);
            connectionTypes.splice(index, 1);

            this._settings.set_strv('vpn-connection-types', connectionTypes);
        });
        const connectionRow = new Adw.ActionRow({
            title,
            activatable_widget: deleteEntry,
        });
        connectionRow.add_suffix(deleteEntry);
        this.vpnTypesExpanderRow.add_row(connectionRow);
        this.vpnTypesExpanderRow._rows.push(connectionRow);
    }
});

var AboutPage = GObject.registerClass(
class IpFinderAboutPage extends Adw.PreferencesPage {
    _init(metadata) {
        super._init({
            title: _('About'),
            icon_name: 'help-about-symbolic',
            name: 'AboutPage',
        });

        const PROJECT_TITLE = _('IP Finder');
        const PROJECT_DESCRIPTION = _('Displays useful information about your public IP Address');
        const PROJECT_IMAGE = 'default_map';
        const SCHEMA_PATH = '/org/gnome/shell/extensions/ip-finder/';

        // Project Logo, title, description-------------------------------------
        const projectHeaderGroup = new Adw.PreferencesGroup();
        const projectHeaderBox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            hexpand: false,
            vexpand: false,
        });

        const projectImage = new Gtk.Image({
            margin_bottom: 5,
            icon_name: PROJECT_IMAGE,
            pixel_size: 100,
        });

        const projectTitleLabel = new Gtk.Label({
            label: _(PROJECT_TITLE),
            css_classes: ['title-1'],
            vexpand: true,
            valign: Gtk.Align.FILL,
        });

        const projectDescriptionLabel = new Gtk.Label({
            label: _(PROJECT_DESCRIPTION),
            hexpand: false,
            vexpand: false,
        });
        projectHeaderBox.append(projectImage);
        projectHeaderBox.append(projectTitleLabel);
        projectHeaderBox.append(projectDescriptionLabel);
        projectHeaderGroup.add(projectHeaderBox);

        this.add(projectHeaderGroup);
        // -----------------------------------------------------------------------

        // Extension/OS Info and Links Group------------------------------------------------
        const infoGroup = new Adw.PreferencesGroup();

        const projectVersionRow = new Adw.ActionRow({
            title: _('IP Finder Version'),
        });
        projectVersionRow.add_suffix(new Gtk.Label({
            label: metadata.version.toString(),
            css_classes: ['dim-label'],
        }));
        infoGroup.add(projectVersionRow);

        if (metadata.commit) {
            const commitRow = new Adw.ActionRow({
                title: _('Git Commit'),
            });
            commitRow.add_suffix(new Gtk.Label({
                label: metadata.commit.toString(),
                css_classes: ['dim-label'],
            }));
            infoGroup.add(commitRow);
        }

        const gnomeVersionRow = new Adw.ActionRow({
            title: _('GNOME Version'),
        });
        gnomeVersionRow.add_suffix(new Gtk.Label({
            label: Config.PACKAGE_VERSION.toString(),
            css_classes: ['dim-label'],
        }));
        infoGroup.add(gnomeVersionRow);

        const osRow = new Adw.ActionRow({
            title: _('OS Name'),
        });

        const name = GLib.get_os_info('NAME');
        const prettyName = GLib.get_os_info('PRETTY_NAME');

        osRow.add_suffix(new Gtk.Label({
            label: prettyName ? prettyName : name,
            css_classes: ['dim-label'],
        }));
        infoGroup.add(osRow);

        const sessionTypeRow = new Adw.ActionRow({
            title: _('Windowing System'),
        });
        sessionTypeRow.add_suffix(new Gtk.Label({
            label: GLib.getenv('XDG_SESSION_TYPE') === 'wayland' ? 'Wayland' : 'X11',
            css_classes: ['dim-label'],
        }));
        infoGroup.add(sessionTypeRow);

        const gitlabRow = this._createLinkRow(_('IP Finder GitLab'), metadata.url);
        infoGroup.add(gitlabRow);

        this.add(infoGroup);
        // -----------------------------------------------------------------------

        // Save/Load Settings----------------------------------------------------------
        const settingsGroup = new Adw.PreferencesGroup();
        const settingsRow = new Adw.ActionRow({
            title: _('IP Finder Settings'),
        });
        const loadButton = new Gtk.Button({
            label: _('Load'),
            valign: Gtk.Align.CENTER,
        });
        loadButton.connect('clicked', () => {
            this._showFileChooser(
                _('Load Settings'),
                {action: Gtk.FileChooserAction.OPEN},
                '_Open',
                filename => {
                    if (filename && GLib.file_test(filename, GLib.FileTest.EXISTS)) {
                        const settingsFile = Gio.File.new_for_path(filename);
                        const [success_, pid_, stdin, stdout, stderr] =
                            GLib.spawn_async_with_pipes(
                                null,
                                ['dconf', 'load', SCHEMA_PATH],
                                null,
                                GLib.SpawnFlags.SEARCH_PATH | GLib.SpawnFlags.DO_NOT_REAP_CHILD,
                                null
                            );

                        const outputStream = new Gio.UnixOutputStream({fd: stdin, close_fd: true});
                        GLib.close(stdout);
                        GLib.close(stderr);

                        outputStream.splice(settingsFile.read(null),
                            Gio.OutputStreamSpliceFlags.CLOSE_SOURCE |
                            Gio.OutputStreamSpliceFlags.CLOSE_TARGET,
                            null);
                    }
                }
            );
        });
        const saveButton = new Gtk.Button({
            label: _('Save'),
            valign: Gtk.Align.CENTER,
        });
        saveButton.connect('clicked', () => {
            this._showFileChooser(
                _('Save Settings'),
                {action: Gtk.FileChooserAction.SAVE},
                '_Save',
                filename => {
                    const file = Gio.file_new_for_path(filename);
                    const raw = file.replace(null, false, Gio.FileCreateFlags.NONE, null);
                    const out = Gio.BufferedOutputStream.new_sized(raw, 4096);

                    out.write_all(GLib.spawn_command_line_sync(`dconf dump ${SCHEMA_PATH}`)[1], null);
                    out.close(null);
                }
            );
        });
        settingsRow.add_suffix(saveButton);
        settingsRow.add_suffix(loadButton);
        settingsGroup.add(settingsRow);
        this.add(settingsGroup);
        // -----------------------------------------------------------------------

        // Credits----------------------------------------------------------------
        const creditsGroup = new Adw.PreferencesGroup({
            title: _('Credits'),
        });
        this.add(creditsGroup);

        const creditsRow = new Adw.PreferencesRow({
            activatable: false,
            selectable: false,
        });
        creditsGroup.add(creditsRow);

        creditsRow.set_child(new Gtk.Label({
            label: CREDITS,
            use_markup: true,
            vexpand: true,
            valign: Gtk.Align.CENTER,
            margin_top: 5,
            margin_bottom: 20,
            hexpand: true,
            halign: Gtk.Align.FILL,
            justify: Gtk.Justification.CENTER,
        }));
        // -----------------------------------------------------------------------

        const gnuSoftwareGroup = new Adw.PreferencesGroup();
        const gnuSofwareLabel = new Gtk.Label({
            label: _(GNU_SOFTWARE),
            use_markup: true,
            justify: Gtk.Justification.CENTER,
        });
        const gnuSofwareLabelBox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            valign: Gtk.Align.END,
            vexpand: true,
        });
        gnuSofwareLabelBox.append(gnuSofwareLabel);
        gnuSoftwareGroup.add(gnuSofwareLabelBox);
        this.add(gnuSoftwareGroup);
    }

    _createLinkRow(title, uri) {
        const image = new Gtk.Image({
            icon_name: 'adw-external-link-symbolic',
            valign: Gtk.Align.CENTER,
        });
        const linkRow = new Adw.ActionRow({
            title: _(title),
            activatable: true,
        });
        linkRow.connect('activated', () => {
            Gtk.show_uri(this.get_root(), uri, Gdk.CURRENT_TIME);
        });
        linkRow.add_suffix(image);

        return linkRow;
    }

    _showFileChooser(title, params, acceptBtn, acceptHandler) {
        const dialog = new Gtk.FileChooserDialog({
            title: _(title),
            transient_for: this.get_root(),
            modal: true,
            action: params.action,
        });
        dialog.add_button('_Cancel', Gtk.ResponseType.CANCEL);
        dialog.add_button(acceptBtn, Gtk.ResponseType.ACCEPT);

        dialog.connect('response', (self, response) => {
            if (response === Gtk.ResponseType.ACCEPT) {
                try {
                    acceptHandler(dialog.get_file().get_path());
                } catch (e) {
                    console.log(`IP-Finder - Filechooser error: ${e}`);
                }
            }
            dialog.destroy();
        });

        dialog.show();
    }
});

export default class IpFinderPrefs extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const iconPath = `${this.path}/icons`;
        const iconTheme = Gtk.IconTheme.get_for_display(Gdk.Display.get_default());
        if (!iconTheme.get_search_path().includes(iconPath))
            iconTheme.add_search_path(iconPath);

        const settings = this.getSettings();

        window.set_search_enabled(true);

        const generalPage = new GeneralPage(settings);
        window.add(generalPage);

        const aboutPage = new AboutPage(this.metadata);
        window.add(aboutPage);
    }
}

const CREDITS = '\n <a href="https://gitlab.com/LinxGem33">LinxGem33</a> (Founder/Maintainer/Graphic Designer)' +
    '\n <a href="https://gitlab.com/AndrewZaech">AndrewZaech</a> (Developer)';

const GNU_SOFTWARE = '<span size="small">' +
    'This program comes with absolutely no warranty.\n' +
    'See the <a href="https://gnu.org/licenses/old-licenses/gpl-2.0.html">' +
    'GNU General Public License, version 2 or later</a> for details.' +
    '</span>';
