const parserList = ["youtube", "vimeo", "nicovideo", "bilibili", "soundcloud", "dailymotion" /*, "vk" */];
const parserConstructors = {};

/**
 * Wrapper that holds several link parsers, where each of them works with a different media-file sharing website in order
 * to fetch, process and parse media data into a standardized format.
 * @type {TrackLinkParser}
 */
module.exports = class TrackLinkParser {
	#options = {};

	/** @type {Object<"string", TrackLinkParserTemplate>} */
	#parsers = {};

	/**
	 * @param {Object} options
	 */
	constructor (options = {}) {
		let usedParsers = parserList;
		if (options.use) {
			if (typeof options.use === "string") {
				usedParsers = [options.use];
			}
			else if (Array.isArray(options.use)) {
				usedParsers = options.use;
			}
			else {
				throw new Error("options.use must be a string or array of strings");
			}
		}

		for (const file of usedParsers) {
			parserConstructors[file] = require("./parsers/" + file + ".js");
		}

		for (const [target, params] of Object.entries(options)) {
			if (target === "use") {
				continue;
			}
			else if (!parserList.includes(target.toLowerCase())) {
				throw new Error("Link parser: unrecognized options for key " + target);
			}

			this.#options[target] = params;
		}

		for (const parser of usedParsers) {
			this.#parsers[parser] = new parserConstructors[parser](this.#options[parser] || {});
		}
	}

	/**
	 * Attempts to detect the website of a media link.
	 * @param {LinkParserName} link
	 * @returns {LinkParserName|null} If no website was detected, reutnrs `null`.
	 * @throws {TypeError} If `link` is not a string.
	 * @throws {Error} If `link` is an empty string.
	 */
	autoRecognize (link) {
		if (typeof link !== "string") {
			throw new TypeError("Link parser: link must be a string");
		}
		else if (link.length === 0) {
			throw new Error("Link parser: link must be a non-empty string");
		}

		for (const [type, parser] of Object.entries(this.#parsers)) {
			if (parser.parseLink(link)) {
				return type;
			}
		}

		return null;
	}

	/**
	 * Attempts to fetch the media file ID from a URL, either through a provided parser type, or automatically.
	 * @param {string} link
	 * @param {LinkParserName|"any"} type = "any" Specific parser name. If `"any"`, every parser will be checked,
	 * and the first proper value will be returned.
	 * @throws {TypeError} If `link` or `type` is not a string.
	 * @throws {Error} If no such parser exists for `type`.
	 * @throws {Error} When using `"any"`, and no link was able to be parsed.
	 */
	parseLink (link, type = "auto") {
		if (typeof link !== "string" || typeof type !== "string") {
			throw new TypeError("Link parser: Both link and type must be string");
		}
		else if (type !== "auto" && !this.#parsers[type]) {
			throw new Error("Link parser: No parser exists for type " + type);
		}

		if (type === "auto") {
			for (const parser of Object.values(this.#parsers)) {
				const parsedLink = parser.parseLink(link);
				if (parsedLink) {
					return parsedLink;
				}
			}

			throw new Error("Link parser: Cannot parse link " + link + " - unable to parse");
		}
		else {
			return this.#parsers[type].parseLink(link);
		}
	}

	/**
	 * Determines if a link is valid for the provided website parser.
	 * @param {string} link
	 * @param {LinkParserName} type
	 * @returns {boolean}
	 * @throws {TypeError} If `link` or `type` is not a string.
	 * @throws {Error} If no such parser exists for `type`.
	 */
	checkValid (link, type) {
		if (typeof link !== "string" || typeof type !== "string") {
			throw new TypeError("Link parser: Both link and type must be string");
		}
		else if (!this.#parsers[type]) {
			throw new Error("Link parser: No parser exists for type " + type);
		}

		return this.#parsers[type].checkLink(link);
	}

	/**
	 * Determines if a link is still available on the provided website, or checks all parsers.
	 * @param {string} link
	 * @param {LinkParserName|"any"} type = "any"
	 * @returns {boolean}
	 * @throws {TypeError} If `link` or `type` is not a string.
	 * @throws {Error} If no such parser exists for `type`.
	 */
	async checkAvailable (link, type = "auto") {
		if (typeof link !== "string" || typeof type !== "string") {
			throw new TypeError("Link parser: Both link and type must be string");
		}
		else if (type !== "auto" && !this.#parsers[type]) {
			throw new Error("Link parser: No parser exists for type " + type);
		}

		if (type === "auto") {
			for (const parser of Object.values(this.#parsers)) {
				const parsedLink = parser.parseLink(link);
				if (parsedLink) {
					return await parser.checkAvailable(parsedLink);
				}
			}

			throw new Error("Link parser: Cannot check availability of link " + link + " - unable to parse");
		}
		else {
			const parsedLink = this.#parsers[type].parseLink(link);
			if (parsedLink) {
				return await this.#parsers[type].checkAvailable(parsedLink);
			}
			else {
				throw new Error("Link parser: Cannot check availability of link " + link + " - unable to parse for type " + type);
			}
		}
	}

	/**
	 * Fetches the media full data for a provided URL.
	 * @param {string} link
	 * @param {LinkParserName|"auto"} type = "auto"
	 * @returns {Promise<LinkParserFetchResponse>}
	 * @throws TypeError If link or type are not string.
	 * @throws {Error} If invalid parser is provided.
	 * @throws {Error} If parser cannot parse the link provided.
	 */
	async fetchData (link, type = "auto") {
		if (typeof link !== "string" || typeof type !== "string") {
			throw new TypeError("Link parser: Both link and type must be string");
		}
		else if (type !== "auto" && !this.#parsers[type]) {
			throw new Error("Link parser: No parser exists for type " + type);
		}

		if (type === "auto") {
			for (const parser of Object.values(this.#parsers)) {
				const parsedLink = parser.parseLink(link);
				if (parsedLink) {
					return await parser.fetchData(parsedLink);
				}
			}

			throw new Error("Link parser: Cannot fetch data for link " + link + " - unable to parse");
		}
		else {
			return await this.#parsers[type].fetchData(link);
		}
	}

	/**
	 * Reloads a parser, based on its name.
	 * @param {LinkParserName} parser
	 * @param {Object} options Options required for the specific parser
	 * @returns {boolean} Determines the success of the reload operation
	 * @throws {Error} If invalid parser name is provided.
	 */
	reloadParser (parser, options = {}) {
		const constructor = parserConstructors[parser];
		if (!constructor) {
			throw new Error("Invalid constructor name provided");
		}

		try {
			this.#parsers[parser] = new parserConstructors[parser](options);
			this.#options[parser] = options;
			return true;
		}
		catch (e) {
			console.error(e);
			return false;
		}
	}

	/**
	 * Fetches a parser instance by its name.
	 * @param {LinkParserName} parser
	 * @returns {TrackLinkParserTemplate} Parser instance - depending on the website provided.
	 */
	getParser (parser) {
		return this.#parsers[parser];
	}
};
