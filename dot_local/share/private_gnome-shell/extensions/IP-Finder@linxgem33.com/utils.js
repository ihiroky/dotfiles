import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Soup from 'gi://Soup';

Gio._promisify(Soup.Session.prototype, 'send_and_read_async');
Gio._promisify(Gio.File.prototype, 'replace_contents_bytes_async', 'replace_contents_finish');

export const ApiService = {
    IP_INFO_IO: 0,
    IP_API_COM: 1,
};

/**
 *
 * @param {Soup.Session} session
 * @param {object} soupParams
 * @param {ApiService} apiService
 * @returns {{data: object | null, error: string | null}} object containing the data of the IP details or error message on fail
 */
export async function getIPDetails(session, soupParams,  apiService) {
    let url;

    const params = soupParams;
    if (apiService === ApiService.IP_API_COM) {
        // See https://ip-api.com/docs/api:json for 'fields' details.
        params.fields = '63479';
        // ip-api.com free use API must use http. https api is a paid feature
        url = 'http://ip-api.com/json/';
    } else if (apiService === ApiService.IP_INFO_IO) {
        url = 'https://ipinfo.io/json';
    }

    const message = Soup.Message.new_from_encoded_form(
        'GET', `${url}`,
        Soup.form_encode_hash(params)
    );

    let data;
    try {
        const bytes = await session.send_and_read_async(message, GLib.PRIORITY_DEFAULT, null);

        const decoder = new TextDecoder('utf-8');
        data = JSON.parse(decoder.decode(bytes.get_data()));
        if (message.statusCode === Soup.Status.OK) {
            return {data};
        } else {
            console.log(`IP-Finder getIpDetails() failed with status code - ${message.statusCode}`);
            const dataError = data['error'] ? `${data['error'].title}. ${data['error'].message}.` : data['message'];
            if (dataError)
                return {error: `${message.statusCode} - ${dataError}.`};
            else
                return {error: `${message.statusCode}`};
        }
    } catch (e) {
        console.log(`IP-Finder getIpDetails() error - ${e}`);
        return {error: `IP-Finder getIpDetails() error - ${e}`};
    }
}

/**
 *
 * @param {Array} coordinates
 * @param {int} zoom
 */
export function getMapTileInfo(coordinates, zoom) {
    const [lat, lon] = coordinates.split(', ').map(Number);
    const xTile = Math.floor((lon + 180.0) / 360.0 * (1 << zoom));
    const yTile = Math.floor((1.0 - Math.log(Math.tan(lat * Math.PI / 180.0) + 1.0 / Math.cos(lat * Math.PI / 180.0)) / Math.PI) / 2.0 * (1 << zoom));

    return {zoom, xTile, yTile};
}

/**
 *
 * @param {Soup.Session} session
 * @param {object} soupParams
 * @param {string} extensionPath
 * @param {string} tileInfo
 * @returns {{file: Gio.File | null, error: string | null}} object containing the map tile file or error message on fail
 */
export async function getMapTile(session, soupParams, extensionPath, tileInfo) {
    const file = Gio.file_new_for_path(`${extensionPath}/icons/latest_map.png`);

    const message = Soup.Message.new_from_encoded_form(
        'GET',
        `https://a.tile.openstreetmap.org/${tileInfo}.png`,
        Soup.form_encode_hash(soupParams)
    );

    let data;
    try {
        const bytes = await session.send_and_read_async(message, GLib.PRIORITY_DEFAULT, null);

        if (message.statusCode === Soup.Status.OK) {
            data = bytes.get_data();
            const [success, etag_] = await file.replace_contents_bytes_async(data, null, false, Gio.FileCreateFlags.REPLACE_DESTINATION, null);
            return success ? {file} : {error: 'Error replacing map tile file.'};
        } else {
            console.log(`IP-Finder getMapTile() failed with status code - ${message.statusCode}`);
            return {error: message.statusCode};
        }
    } catch (e) {
        console.log(`IP-Finder getMapTile() error - ${e}`);
        return {error: message.statusCode};
    }
}
