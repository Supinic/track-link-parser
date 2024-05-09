import { DailymotionData } from "./dailymotion";

export abstract class LinkParser {
	constructor(options: Options) { }

	/**
	 * @abstract
	 * Returns a boolean determining if a given URL belongs to the media website a parser instance governs.
	 * @param {string} link Input link to check.
	 * @param {boolean} noURL If true, the input provided is considered just the media ID - and not a full URL.
	 * @returns {boolean}
	 * @throws {Error} If the parser cannot determine the result - only if `noURL` is true
	 */
	abstract checkLink(link: string, noURL: boolean): boolean;

	/**
	 * @abstract
	 * For a given URL, attempts to parse out the media ID.
	 * Returns `null` if no ID was found.
	 * @param {string} link
	 * @returns {string|null}
	 */
	abstract parseLink(link: string): string | null;

	/**
	 * @abstract
	 * Returns a boolean determining if a given media ID is still available on the website.
	 * @param {string} link
	 * @returns {Promise<boolean>}
	 */
	abstract checkAvailable(link: string): Promise<boolean>;

	/**
	 * @abstract
	 * For a given media file ID, fetches a (mostly) standardized response that describes the media.
	 * @returns {Promise<LinkParserFetchResponse|null>}
	 */
	abstract fetchData(mediaID: string): Promise<Response | null>;
};

/**
 * @typedef {"bilibili"|"dailymotion"|"nicovideo"|"soundcloud"|"vimeo"|"vk"|"youtube"} LinkParserName
 */

/**
 * @typedef {Object} LinkParserFetchResponse
 * @property {LinkParserName} type Name of the website the parser used.
 * @property {string} ID Media ID.
 * @property {string} link Full media URL.
 * @property {string} name Media name as it appears on the website.
 * @property {string|null} author Media author's name, if any exists.
 * @property {string|number|null} authorID Only available if the media author exists and the website supports author IDs.
 * @property {string|null} description Media description - as the author describes it.
 * @property {number|null} duration Length of the media, expressed in seconds. Can be integer or float, depending on site.
 * @property {Date|null} created Date, or datetime, of the media's publishing to the website.
 * @property {number|null} views Amount of cumulative viewers.
 * @property {number|null} comments Amount of comments.
 * @property {number|null} likes Amount of likes. Dislikes are not available across websites in general, hence they're not included here.
 * @property {string|null} thumbnail Video thumbnail, if available.
 * @property {BilibiliParserData|DailymotionData|NicovideoParserData|SoundcloudParserData|VimeoParserData|YoutubeParserData} extra
 * Website-specific extra data, depends on the parser instance used.
 */


export type Name = "bilibili" | "dailymotion" | "nicovideo" | "soundcloud" | "vimeo" | "vk" | "youtube";
export type Response = {
	type: Name;
	ID: string;
	link: string;
	name: string;
	author: string | null;
	authorID: string | number | null;
	description: string | null;
	duration: number | null;
	created: Date | null;
	views: number | null;
	comments: number | null;
	likes: number | null;
	thumbnail: string | null;
	// extra: BilibiliData | DailymotionData | NicovideoData | SoundcloudData | VimeoData | VKData | YoutubeData
	extra: DailymotionData;
};

export type Options = {};
// type Options = BilibiliOptions | SoundcloudOptions | YoutubeOptions | {};
