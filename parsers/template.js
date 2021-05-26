module.exports = class TrackLinkParserTemplate {
	/**
	 * @abstract
	 * Returns a boolean determining if a given URL belongs to the media website a parser instance governs.
	 * @param {string} link Input link to check.
	 * @param {boolean} noURL If true, the input provided is considered just the media ID - and not a full URL.
	 * @returns {boolean}
	 * @throws {Error} If the parser cannot determine the result - only if `noURL` is true
	 */
	checkLink (link, noURL) {
		throw new Error("Method checkLink() must be implemented");
	}

	/**
	 * @abstract
	 * For a given URL, attempts to parse out the media ID.
	 * Returns `null` if no ID was found.
	 * @param {string} link
	 * @returns {string|null}
	 */
	parseLink (link) {
		throw new Error("Method parseLink() must be implemented");
	}

	/**
	 * @abstract
	 * Returns a boolean determining if a given media ID is still available on the website.
	 * @param {string} link
	 * @returns {Promise<boolean>}
	 */
	checkAvailable (link) {
		throw new Error("Method checkAvailable() must be implemented");
	}

	/**
	 * @abstract
	 * For a given media file ID, fetches a (mostly) standardized response that describes the media.
	 * @returns {Promise<LinkParserFetchResponse|null>}
	 */
	fetchData (mediaID) {
		throw new Error("Method fetchData() must be implemented");
	}
};

/**
 * @typedef {"bilibili"|"nicovideo"|"soundcloud"|"vimeo"|"vk"|"youtube"} LinkParserName
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
 * @property {BilibiliParserData|NicovideoParserData|SoundcloudParserData|VimeoParserData|YoutubeParserData} extra
 * Website-specific extra data, depends on the parser instance used.
 */
