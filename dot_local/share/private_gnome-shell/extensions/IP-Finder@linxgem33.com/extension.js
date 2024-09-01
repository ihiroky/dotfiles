/* eslint-disable jsdoc/require-jsdoc */
/*
 * IP-Finder GNOME Extension by ArcMenu Team
 * https://gitlab.com/arcmenu-team/IP-Finder
 *
 * ArcMenu Team
 * Andrew Zaech https://gitlab.com/AndrewZaech
 * LinxGem33 (Andy C) https://gitlab.com/LinxGem33
 *
 * Find more from ArcMenu Team at
 * https://gitlab.com/arcmenu-team
 * https://github.com/ArcMenu
 *
 * Credits: _syncMainConnection(), _mainConnectionStateChanged()
 *  _flushConnectivityQueue(), _closeConnectivityCheck(), _portalHelperDone(), _syncConnectivity()
 * borrowed from GNOME shell.
 *
 * This file is part of IP Finder gnome extension.
 * IP Finder gnome extension is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * IP Finder gnome extension is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with IP Finder gnome extension.  If not, see <http://www.gnu.org/licenses/>.
 */

import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import Mtk from 'gi://Mtk';
import NM from 'gi://NM';
import Soup from 'gi://Soup';
import St from 'gi://St';

import * as Config from 'resource:///org/gnome/shell/misc/config.js';
import {loadInterfaceXML} from 'resource:///org/gnome/shell/misc/fileUtils.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

import * as Utils from './utils.js';

import {Extension, gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';

const PortalHelperIface = loadInterfaceXML('org.gnome.Shell.PortalHelper');
const PortalHelperInfo = Gio.DBusInterfaceInfo.new_for_xml(PortalHelperIface);

const PortalHelperResult = {
    CANCELLED: 0,
    COMPLETED: 1,
    RECHECK: 2,
};

const VpnWidgets = {
    ALL: 0,
    ICON_ONLY: 1,
    TEXT_ONLY: 2,
};

const PanelActors = {
    FLAG_IP: 0,
    FLAG: 1,
    IP: 2,
};

const DEBUG_LOG = false;
function debugLog(msg) {
    if (!DEBUG_LOG)
        return;

    console.log(msg);
}

function getFlagEmoji(countryCode) {
    return [...countryCode.toUpperCase()].map(char =>
        String.fromCodePoint(127397 + char.charCodeAt())
    ).reduce((a, b) => `${a}${b}`);
}

var VpnInfoBox = GObject.registerClass(
class IPFinderVpnInfoBox extends St.BoxLayout {
    _init(params) {
        super._init({
            ...params,
        });

        this._vpnTitleLabel = new St.Label({
            style_class: 'ip-info-vpn-off',
            text: `${_('VPN')}: `,
            x_align: Clutter.ActorAlign.FILL,
            y_align: Clutter.ActorAlign.START,
            y_expand: false,
        });
        this.add_child(this._vpnTitleLabel);
        this._vpnStatusLabel = new St.Label({
            x_align: Clutter.ActorAlign.FILL,
            y_align: Clutter.ActorAlign.START,
            x_expand: true,
            y_expand: false,
            style_class: 'ip-info-vpn-off',
        });
        this.add_child(this._vpnStatusLabel);

        this._vpnIcon = new St.Icon({
            style_class: 'popup-menu-icon ip-info-vpn-off',
        });
        this.add_child(this._vpnIcon);
    }

    setVpnStatus(vpnStatus) {
        this._vpnTitleLabel.set_style_class_name(vpnStatus.styleClass);
        this._vpnStatusLabel.set_style_class_name(vpnStatus.styleClass);
        this._vpnIcon.set_style_class_name(`popup-menu-icon ${vpnStatus.styleClass}`);

        this._vpnStatusLabel.text = vpnStatus.vpnOn ? vpnStatus.vpnName : _('Off');
        this._vpnIcon.gicon = Gio.icon_new_for_string(vpnStatus.iconPath);
    }
});

var BaseButton = GObject.registerClass(
class IPFinderBaseButton extends St.Button {
    _init(text, params) {
        super._init({
            style_class: 'icon-button',
            reactive: true,
            can_focus: true,
            track_hover: true,
            button_mask: St.ButtonMask.ONE | St.ButtonMask.TWO,
            ...params,
        });

        this.connect('notify::hover', () => this._onHover());
        this.connect('destroy', () => this._onDestroy());

        this.tooltipLabel = new St.Label({
            style_class: 'dash-label tooltip-label',
            text: _(text),
        });
        this.tooltipLabel.hide();
        global.stage.add_child(this.tooltipLabel);
    }

    _onHover() {
        if (this.hover)
            this.showLabel();
        else
            this.hideLabel();
    }

    showLabel() {
        this.tooltipLabel.opacity = 0;
        this.tooltipLabel.show();

        const [stageX, stageY] = this.get_transformed_position();

        const itemWidth = this.allocation.get_width();
        const itemHeight = this.allocation.get_height();

        const labelWidth = this.tooltipLabel.get_width();
        const labelHeight = this.tooltipLabel.get_height();
        const offset = 6;
        const xOffset = Math.floor((itemWidth - labelWidth) / 2);

        const monitorIndex = Main.layoutManager.findIndexForActor(this);
        const workArea = Main.layoutManager.getWorkAreaForMonitor(monitorIndex);

        let y;
        const x = Math.clamp(stageX + xOffset, 0 + offset, workArea.x + workArea.width - labelWidth - offset);

        // Check if should place tool-tip above or below app icon
        // Needed in case user has moved the panel to bottom of screen
        const labelBelowIconRect = new Mtk.Rectangle({
            x,
            y: stageY + itemHeight + offset,
            width: labelWidth,
            height: labelHeight,
        });

        if (workArea.contains_rect(labelBelowIconRect))
            y = labelBelowIconRect.y;
        else
            y = stageY - labelHeight - offset;

        this.tooltipLabel.remove_all_transitions();
        this.tooltipLabel.set_position(x, y);
        this.tooltipLabel.ease({
            opacity: 255,
            duration: 250,
            mode: Clutter.AnimationMode.EASE_OUT_QUAD,
        });
    }

    hideLabel() {
        this.tooltipLabel.ease({
            opacity: 0,
            duration: 100,
            mode: Clutter.AnimationMode.EASE_OUT_QUAD,
            onComplete: () => this.tooltipLabel.hide(),
        });
    }

    _onDestroy() {
        this.tooltipLabel.remove_all_transitions();
        this.tooltipLabel.hide();
        global.stage.remove_child(this.tooltipLabel);
        this.tooltipLabel.destroy();
    }
});

var IPFinderMenuButton = GObject.registerClass(
class IPFinderMenuButton extends PanelMenu.Button {
    _init(extension) {
        super._init(0.5, _('IP Details'));
        this.menu.box.style = 'padding: 16px;';

        this._defaultIpData = {
            ip: {name: _('IP Address'), text: _('Loading IP Details')},
            query: {name: _('IP Address'), text: _('Loading IP Details')},
            hostname: {name: _('Hostname'), text: ''},
            reverse: {name: _('Hostname'), text: ''},
            org: {name: _('Org'), text: ''},
            city: {name: _('City'), text: ''},
            region: {name: _('Region'), text: ''},
            country: {name: _('Country'), text: ''},
            loc: {name: _('Location'), text: ''},
            postal: {name: _('Postal'), text: ''},
            zip: {name: _('Postal'), text: ''},
            timezone: {name: _('Timezone'), text: ''},
        };

        this._extension = extension;
        this._settings = extension.getSettings();
        this._createSettingsConnections();

        this._textureCache = St.TextureCache.get_default();

        const SESSION_TYPE = GLib.getenv('XDG_SESSION_TYPE');
        const PACKAGE_VERSION = Config.PACKAGE_VERSION;
        const USER_AGENT = `User-Agent: Mozilla/5.0 (${SESSION_TYPE}; GNOME Shell/${PACKAGE_VERSION}; Linux ${GLib.getenv('CPU')};) IP_Finder/${this._extension.metadata.version}`;
        this._session = new Soup.Session({user_agent: USER_AGENT, timeout: 60});

        this._defaultMapTile = `${this._extension.path}/icons/default_map.png`;
        this._latestMapTile = `${this._extension.path}/icons/latest_map.png`;

        const panelBox = new St.BoxLayout({
            x_align: Clutter.ActorAlign.FILL,
            y_align: Clutter.ActorAlign.FILL,
            style_class: 'panel-status-menu-box',
        });
        this.add_child(panelBox);

        this._vpnStatusIcon = new St.Icon({
            icon_name: 'changes-prevent-symbolic',
            x_align: Clutter.ActorAlign.START,
            y_align: Clutter.ActorAlign.CENTER,
            style_class: 'system-status-icon',
        });
        panelBox.add_child(this._vpnStatusIcon);

        this._ipAddress = this._defaultIpData.ip.text;
        this._ipAddressLabel = new St.Label({
            text: this._ipAddress,
            y_align: Clutter.ActorAlign.CENTER,
            style_class: 'system-status-icon',
        });
        panelBox.add_child(this._ipAddressLabel);

        this._statusIcon = new St.Icon({
            icon_name: 'network-wired-acquiring-symbolic',
            x_align: Clutter.ActorAlign.START,
            y_align: Clutter.ActorAlign.CENTER,
            style_class: 'system-status-icon',
        });
        panelBox.add_child(this._statusIcon);

        this._flagIcon = new St.Label({
            x_align: Clutter.ActorAlign.START,
            y_align: Clutter.ActorAlign.CENTER,
            style_class: 'system-status-icon',
            visible: false,
        });
        panelBox.add_child(this._flagIcon);

        const menuSection = new PopupMenu.PopupMenuSection();
        this.menu.addMenuItem(menuSection);

        const mapAndIpDetailsBox = new St.BoxLayout({
            x_align: Clutter.ActorAlign.FILL,
            x_expand: true,
            style: 'min-width:540px; padding-bottom: 10px;',
        });
        menuSection.actor.add_child(mapAndIpDetailsBox);

        this._mapTileBox = new St.BoxLayout({
            vertical: true,
            x_align: Clutter.ActorAlign.CENTER,
            y_align: Clutter.ActorAlign.CENTER,
            y_expand: true,
        });
        mapAndIpDetailsBox.add_child(this._mapTileBox);
        this._mapTileBox.add_child(this._getMapTileIcon(this._defaultMapTile));

        const ipInfoParentBox = new St.BoxLayout({
            style_class: 'ip-info-box',
            vertical: true,
            x_align: Clutter.ActorAlign.CENTER,
        });
        mapAndIpDetailsBox.add_child(ipInfoParentBox);

        this._vpnInfoBox = new VpnInfoBox();
        ipInfoParentBox.add_child(this._vpnInfoBox);

        this._ipInfoBox = new St.BoxLayout({
            vertical: true,
        });
        ipInfoParentBox.add_child(this._ipInfoBox);

        const buttonBox = new St.BoxLayout();
        menuSection.actor.add_child(buttonBox);

        const settingsButton = new BaseButton(_('Settings'), {
            icon_name: 'emblem-system-symbolic',
        });
        settingsButton.connect('clicked', () => {
            extension.openPreferences();
            this.menu.toggle();
        });
        buttonBox.add_child(settingsButton);

        const copyButton = new BaseButton(_('Copy IP'), {
            icon_name: 'edit-copy-symbolic',
            x_expand: true,
            x_align: Clutter.ActorAlign.CENTER,
        });
        copyButton.connect('clicked', () => this._setClipboardText(this._ipAddress));
        buttonBox.add_child(copyButton);

        const refreshButton = new BaseButton(_('Refresh'), {
            icon_name: 'view-refresh-symbolic',
            x_expand: false,
            x_align: Clutter.ActorAlign.END,
        });
        refreshButton.connect('clicked', () => this._startGetIpInfo());
        buttonBox.add_child(refreshButton);

        NM.Client.new_async(null, this.establishNetworkConnectivity.bind(this));

        Main.panel.addToStatusArea('ip-menu', this, 1, this._settings.get_string('position-in-panel'));
        this._updatePanelWidgets();
        this._updateVPNWidgets();
    }

    _setClipboardText(text) {
        const clipboard = St.Clipboard.get_default();
        clipboard.set_text(St.ClipboardType.CLIPBOARD, text);
    }

    _createSettingsConnections() {
        this._settings.connectObject('changed::vpn-status', () => this._updateVPNWidgets(), this);
        this._settings.connectObject('changed::vpn-widgets', () => this._updateVPNWidgets(), this);
        this._settings.connectObject('changed::vpn-status-only-when-on', () => this._updateVPNWidgets(), this);
        this._settings.connectObject('changed::vpn-icon-color', () => this._updateVPNWidgets(), this);
        this._settings.connectObject('changed::vpn-ip-address-color', () => this._updateVPNWidgets(), this);
        this._settings.connectObject('changed::position-in-panel', () => this._updatePosition(), this);
        this._settings.connectObject('changed::actors-in-panel', () => this._updatePanelWidgets(), this);
        this._settings.connectObject('changed::vpn-connections-whitelist', () => this._startGetIpInfo(), this);
        this._settings.connectObject('changed::api-service', () => this._startGetIpInfo(), this);
        this._settings.connectObject('changed::tile-zoom', () => this._startGetIpInfo(), this);
        this._settings.connectObject('changed::vpn-connection-types', () => this._startGetIpInfo(), this);
    }

    _updatePosition() {
        Main.panel.statusArea['ip-menu'] = null;
        Main.panel.addToStatusArea('ip-menu', this, 1, this._settings.get_string('position-in-panel'));
    }

    _updatePanelWidgets() {
        // Show/hide flagIcon and ipAddressLabel based on 'actors-in-panel' setting
        const panelActors = this._settings.get_enum('actors-in-panel');
        if (panelActors === PanelActors.FLAG_IP) {
            this._flagIcon.show();
            this._ipAddressLabel.show();
        } else if (panelActors === PanelActors.FLAG) {
            this._flagIcon.show();
            this._ipAddressLabel.hide();
        } else if (panelActors === PanelActors.IP) {
            this._flagIcon.hide();
            this._ipAddressLabel.show();
        }

        this._setPanelWidgetsPadding();
    }

    _updateVPNWidgets() {
        const showWhenActiveVpn = this._settings.get_boolean('vpn-status-only-when-on') ? this._vpnConnectionOn : true;
        const showVpnStatus = this._settings.get_boolean('vpn-status') && showWhenActiveVpn;
        const vpnWidgets = this._settings.get_enum('vpn-widgets');

        // The vpn 'lock' icon in the panelmenu.button
        this._vpnStatusIcon.visible = showVpnStatus && vpnWidgets !== VpnWidgets.TEXT_ONLY;
        // The vpn info box in the panelmenu.button popupmenu
        this._vpnInfoBox.visible = showVpnStatus && vpnWidgets !== VpnWidgets.ICON_ONLY;

        this._vpnStatusIcon.icon_name = this._vpnConnectionOn ? 'changes-prevent-symbolic' : 'changes-allow-symbolic';
        if (this._settings.get_boolean('vpn-icon-color'))
            this._vpnStatusIcon.style_class = this._vpnConnectionOn ? 'system-status-icon ip-info-vpn-on' : 'system-status-icon ip-info-vpn-off';
        else
            this._vpnStatusIcon.style_class = 'system-status-icon';

        if (this._settings.get_boolean('vpn-ip-address-color'))
            this._ipAddressLabel.style_class = this._vpnConnectionOn ? 'system-status-icon ip-info-vpn-on' : 'system-status-icon ip-info-vpn-off';
        else
            this._ipAddressLabel.style_class = 'system-status-icon';

        this._setPanelWidgetsPadding();
    }

    _setPanelWidgetsPadding() {
        const iconShown = this._flagIcon.visible || this._statusIcon.visible;
        const ipLabelShown = this._ipAddressLabel.visible;
        const vpnIconShown = this._vpnStatusIcon.visible;

        // Adjust the ipAddressLabel padding depending on which panel widgets are visible.
        let style = '';
        if (iconShown && ipLabelShown && vpnIconShown)
            style = 'padding-left: 0px; padding-right: 0px;';
        else if (iconShown && ipLabelShown && !vpnIconShown)
            style = 'padding-right: 0px;';
        else if (!iconShown && ipLabelShown && vpnIconShown)
            style = 'padding-left: 0px;';
        else if (!iconShown && ipLabelShown && !vpnIconShown)
            style = '';

        this._ipAddressLabel.style = style;
    }

    establishNetworkConnectivity(obj, result) {
        this._client = NM.Client.new_finish(result);

        this._connectivityQueue = new Set();

        this._mainConnection = null;

        this._client.connectObject(
            'notify::primary-connection', () => this._syncMainConnection(),
            'notify::activating-connection', () => this._syncMainConnection(),
            'notify::active-connections', () => this._syncMainConnection(),
            'notify::connectivity', () => this._syncConnectivity(),
            this);
        this._syncMainConnection();
    }

    _syncMainConnection() {
        this._setAcquiringDetials();
        this._mainConnection?.disconnectObject(this);

        this._mainConnection =
            this._client.get_primary_connection() ||
            this._client.get_activating_connection();

        if (this._mainConnection) {
            this._mainConnection.connectObject('notify::state',
                this._mainConnectionStateChanged.bind(this), this);
            this._mainConnectionStateChanged();
        }

        this._syncConnectivity();
    }

    _mainConnectionStateChanged() {
        if (this._mainConnection.state === NM.ActiveConnectionState.ACTIVATED)
            this._startGetIpInfo();
    }

    _startGetIpInfo() {
        this._session.abort();
        this._removeGetIpInfoId();
        this._setAcquiringDetials();

        this._getIpInfoId = GLib.timeout_add(0, 2000, () => {
            this._getIpInfo().catch(err => console.log(err));
            this._getIpInfoId = null;
            return GLib.SOURCE_REMOVE;
        });
    }

    _removeGetIpInfoId() {
        if (this._getIpInfoId) {
            GLib.source_remove(this._getIpInfoId);
            this._getIpInfoId = null;
        }
    }

    _flushConnectivityQueue() {
        for (const item of this._connectivityQueue)
            this._portalHelperProxy?.CloseAsync(item);
        this._connectivityQueue.clear();
    }

    _closeConnectivityCheck(path) {
        if (this._connectivityQueue.delete(path))
            this._portalHelperProxy?.CloseAsync(path);
    }

    async _portalHelperDone(proxy, emitter, parameters) {
        const [path, result] = parameters;

        if (result === PortalHelperResult.CANCELLED) {
            this._setIpDetails();
            // Keep the connection in the queue, so the user is not
            // spammed with more logins until we next flush the queue,
            // which will happen once they choose a better connection
            // or we get to full connectivity through other means
        } else if (result === PortalHelperResult.COMPLETED) {
            this._startGetIpInfo();
            this._closeConnectivityCheck(path);
        } else if (result === PortalHelperResult.RECHECK) {
            this._setIpDetails();
            try {
                const state = await this._client.check_connectivity_async(null);
                if (state >= NM.ConnectivityState.FULL) {
                    this._startGetIpInfo();
                    this._closeConnectivityCheck(path);
                }
            } catch (e) { }
        } else {
            this._setIpDetails(null, `Invalid result from portal helper: ${result}`);
        }
    }

    async _syncConnectivity() {
        if (this._client.get_active_connections().length < 1 || this._client.connectivity === NM.ConnectivityState.NONE)
            this._setIpDetails();

        if (this._mainConnection == null ||
            this._mainConnection.state !== NM.ActiveConnectionState.ACTIVATED) {
            this._setIpDetails();
            this._flushConnectivityQueue();
            return;
        }

        let isPortal = this._client.connectivity === NM.ConnectivityState.PORTAL;
        // For testing, allow interpreting any value != FULL as PORTAL, because
        // LIMITED (no upstream route after the default gateway) is easy to obtain
        // with a tethered phone
        // NONE is also possible, with a connection configured to force no default route
        // (but in general we should only prompt a portal if we know there is a portal)
        if (GLib.getenv('GNOME_SHELL_CONNECTIVITY_TEST') != null)
            isPortal ||= this._client.connectivity < NM.ConnectivityState.FULL;
        if (!isPortal)
            return;

        const path = this._mainConnection.get_path();
        if (this._connectivityQueue.has(path))
            return;

        const timestamp = global.get_current_time();
        if (!this._portalHelperProxy) {
            this._portalHelperProxy = new Gio.DBusProxy({
                g_connection: Gio.DBus.session,
                g_name: 'org.gnome.Shell.PortalHelper',
                g_object_path: '/org/gnome/Shell/PortalHelper',
                g_interface_name: PortalHelperInfo.name,
                g_interface_info: PortalHelperInfo,
            });
            this._portalHelperProxy.connectSignal('Done',
                () => this._portalHelperDone().catch(logError));

            try {
                await this._portalHelperProxy.init_async(
                    GLib.PRIORITY_DEFAULT, null);
            } catch (e) {
                console.error(`Error launching the portal helper: ${e.message}`);
            }
        }

        this._portalHelperProxy?.AuthenticateAsync(path, this._client.connectivity_check_uri, timestamp).catch(logError);

        this._connectivityQueue.add(path);
    }

    async _getIpInfo() {
        this._setAcquiringDetials();

        this._vpnConnectionOn = false;
        this._vpnConnectionName = null;

        if (this._client.connectivity === NM.ConnectivityState.NONE) {
            this._setIpDetails();
            return;
        }

        const whiteList = this._settings.get_strv('vpn-connections-whitelist');
        const activeConnectionIds = [];
        const activeConnections = this._client.get_active_connections() || [];

        const handledTypes = this._settings.get_strv('vpn-connection-types');

        debugLog('IP-Finder Log');
        debugLog('Active Connections--------------------------');
        activeConnections.forEach(a => {
            activeConnectionIds.push(a.id);
            if (a.state === NM.ActiveConnectionState.ACTIVATED && (handledTypes.includes(a.type) || whiteList.includes(a.id))) {
                debugLog(`VPN Connection: '${a.id}', Type: '${a.type}'`);
                this._vpnConnectionOn = true;
                this._vpnConnectionName = a.id;
            } else {
                debugLog(`Connection: '${a.id}', Type: '${a.type}'`);
            }
        });
        debugLog('--------------------------------------------');
        debugLog('');

        this._settings.set_strv('current-connection-ids', activeConnectionIds);

        if (activeConnections.length < 1) {
            this._setIpDetails();
            return;
        }

        const apiService = this._settings.get_enum('api-service');
        const {data, error} = await Utils.getIPDetails(this._session, this._extension.soupParams, apiService);
        this._setIpDetails(data, error);
    }

    _setAcquiringDetials() {
        this._flagIcon.hide();
        this._statusIcon.show();
        this._ipAddressLabel.text = _(this._defaultIpData.ip.text);
        this._ipAddressLabel.style_class = 'system-status-icon';
        this._statusIcon.icon_name = 'network-wired-acquiring-symbolic';
        this._vpnStatusIcon.style_class = 'system-status-icon';
        this._vpnStatusIcon.hide();
        this._vpnInfoBox.hide();
    }

    _setIpDetails(data, error) {
        this._ipInfoBox.destroy_all_children();
        this._mapTileBox.destroy_all_children();

        // null data indicates no connection found or error in gathering ip info
        if (!data) {
            this._ipAddressLabel.style_class = 'system-status-icon';
            this._ipAddressLabel.text = error ? _('Error!') : _('No Connection');
            this._statusIcon.show();
            this._statusIcon.icon_name = 'network-offline-symbolic';
            this._vpnStatusIcon.style_class = 'system-status-icon';

            const ipInfoRow = new St.BoxLayout();
            this._ipInfoBox.add_child(ipInfoRow);

            const label = new St.Label({
                style_class: 'ip-info-key',
                text: error ? `${error}` : _('No Connection'),
                x_align: Clutter.ActorAlign.CENTER,
                x_expand: true,
            });
            ipInfoRow.add_child(label);

            this._mapTileBox.add_child(this._getMapTileIcon(this._defaultMapTile));
            return;
        }

        this._statusIcon.hide();

        if (!data['loc']) {
            const lat = data['lat']?.toString();
            const lon = data['lon']?.toString();
            data['loc'] = lat.concat(', ', lon);
        } else {
            const location = data['loc'];
            const [lat, lon] = location.split(',');
            data['loc'] = lat.concat(', ', lon);
        }

        this._ipAddress = data.ip || data.query;
        this._ipAddressLabel.text = this._ipAddress;

        const panelActors = this._settings.get_enum('actors-in-panel');
        if (panelActors === PanelActors.FLAG_IP || panelActors === PanelActors.FLAG)
            this._flagIcon.show();

        this._flagIcon.text = getFlagEmoji(data.countryCode || data.country);

        this._vpnInfoBox.setVpnStatus({
            vpnOn: this._vpnConnectionOn,
            iconPath: this._vpnConnectionOn ? 'changes-prevent-symbolic' : 'changes-allow-symbolic',
            vpnName: this._vpnConnectionName ? this._vpnConnectionName : _('On'),
            styleClass: this._vpnConnectionOn ? 'ip-info-vpn-on' : 'ip-info-vpn-off',
        });

        this._updatePanelWidgets();
        this._updateVPNWidgets();

        this._ipInfoBox.add_child(new PopupMenu.PopupSeparatorMenuItem());

        for (const key in this._defaultIpData) {
            if (data[key]) {
                const ipInfoRow = new St.BoxLayout();
                this._ipInfoBox.add_child(ipInfoRow);

                const label = new St.Label({
                    style_class: 'ip-info-key',
                    text: `${_(this._defaultIpData[key].name)}: `,
                    x_align: Clutter.ActorAlign.FILL,
                    y_align: Clutter.ActorAlign.CENTER,
                    y_expand: true,
                });
                ipInfoRow.add_child(label);

                const infoLabel = new St.Label({
                    x_align: Clutter.ActorAlign.FILL,
                    y_align: Clutter.ActorAlign.CENTER,
                    x_expand: true,
                    y_expand: true,
                    style_class: 'ip-info-value',
                    text: data[key],
                });
                const dataLabelBtn = new St.Button({
                    child: infoLabel,
                });
                dataLabelBtn.connect('button-press-event', () => {
                    this._setClipboardText(dataLabelBtn.child.text);
                });
                ipInfoRow.add_child(dataLabelBtn);
            }
        }

        this._ipInfoBox.add_child(new PopupMenu.PopupSeparatorMenuItem());

        const location = data['loc'];
        this._setMapTile(location).catch(e => console.log(e));
    }

    async _setMapTile(location) {
        const zoom = this._settings.get_int('tile-zoom');
        const mapTileInfo = Utils.getMapTileInfo(location, zoom);
        const mapTileCoordinates = `${mapTileInfo.xTile},${mapTileInfo.yTile}`;
        const mapTileUrl = `${mapTileInfo.zoom}/${mapTileInfo.xTile}/${mapTileInfo.yTile}`;

        if (mapTileCoordinates !== this._settings.get_string('map-tile-coords') || !this._checkLatestFileMapExists()) {
            this._mapTileBox.add_child(this._getMapTileIcon(this._defaultMapTile));
            const mapLabel = new St.Label({
                style_class: 'ip-info-key',
                text: _('Loading new map tile...'),
                x_align: Clutter.ActorAlign.CENTER,
            });
            this._mapTileBox.add_child(mapLabel);

            const {file, error} = await Utils.getMapTile(this._session, this._extension.soupParams, this._extension.path, mapTileUrl);

            if (error) {
                mapLabel.text = _(`Error getting map tile: ${error}`);
            } else {
                this._settings.set_string('map-tile-coords', mapTileCoordinates);
                this._mapTileBox.destroy_all_children();
                this._mapTileBox.add_child(this._textureCache.load_file_async(file, -1, 200, 1, 1));
            }
            return;
        }

        this._mapTileBox.add_child(this._getMapTileIcon(this._latestMapTile));
    }

    _getMapTileIcon(mapTile) {
        if (mapTile === this._defaultMapTile)
            return new St.Icon({gicon: Gio.icon_new_for_string(mapTile), icon_size: 200});
        else
            return this._textureCache.load_file_async(Gio.file_new_for_path(this._latestMapTile), -1, 200, 1, 1);
    }

    _checkLatestFileMapExists() {
        const file = Gio.File.new_for_path(this._latestMapTile);
        return file.query_exists(null);
    }

    disable() {
        this._removeGetIpInfoId();

        this._client?.disconnectObject(this);
        this._settings.disconnectObject(this);

        this._settings = null;
    }
});

export default class IpFinder extends Extension {
    enable() {
        this.soupParams = {
            id: `ip-finder/'v${this.metadata.version}`,
        };
        this._menuButton = new IPFinderMenuButton(this);
    }

    disable() {
        this.soupParams = null;
        this._menuButton.disable();
        this._menuButton.destroy();
        this._menuButton = null;
    }
}
