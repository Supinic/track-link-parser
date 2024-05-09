import * as LinkParser from "./parsers/template.js";

// const parserList = ["youtube", "vimeo", "nicovideo", "bilibili", "soundcloud", "dailymotion" /*, "vk" */];
const parserList = ["dailymotion"];
const parserConstructors: Map<string, { new(options: LinkParser.Options): LinkParser.LinkParser; }> = new Map();

export type ParserName = LinkParser.Name;
export type Link = string;

type ParserMetaOptions = {
	[P in ParserName]?: LinkParser.Options; // @todo possible to map specific ParserName to its Parser.Options?
};
export type Options = ParserMetaOptions & {
	use?: string | string[] | LinkParser.Options;
};

/**
 * Wrapper that holds several link parsers, where each of them works with a different media-file sharing website in order
 * to fetch, process and parse media data into a standardized format.
 */
export class TrackLinkParser {
	#options: Map<string, string | string[] | LinkParser.Options> = new Map();

	#parsers: Map<string, LinkParser.LinkParser> = new Map();

	constructor(options: Options = {}) {
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
			parserConstructors.set(file, require("./parsers/" + file + ".js"));
		}

		for (const [target, params] of Object.entries(options)) {
			if (target === "use") {
				continue;
			}
			else if (!parserList.includes(target.toLowerCase())) {
				throw new Error("Link parser: unrecognized options for key " + target);
			}

			this.#options.set(target, params);
		}

		for (const parser of usedParsers) {
			let constructor = parserConstructors.get(parser)!;
			const parserInstance = new constructor(this.#options.get(parser) || {})
			this.#parsers.set(parser, parserInstance);
		}
	}

	/**
	 * Attempts to detect the website of a media link.
	 * @param {LinkParserName} link
	 * @returns {LinkParserName|null} If no website was detected, reutnrs `null`.
	 * @throws {TypeError} If `link` is not a string.
	 * @throws {Error} If `link` is an empty string.
	 */
	autoRecognize(link: Link): Link | null {
		if (typeof link !== "string") {
			throw new TypeError("Link parser: link must be a string");
		}
		else if (link.length === 0) {
			throw new Error("Link parser: link must be a non-empty string");
		}

		for (const [type, parser] of this.#parsers) {
			if (parser.parseLink(link)) {
				return type;
			}
		}

		return null;
	}

	/**
	 * Attempts to fetch the media file ID from a URL, either through a provided parser type, or automatically.
	 * @param {string} link
	 * @param {LinkParserName|"auto"} type = "auto" Specific parser name. If `"auto"`, every parser will be checked,
	 * and the first proper value will be returned.
	 * @throws {TypeError} If `link` or `type` is not a string.
	 * @throws {Error} If no such parser exists for `type`.
	 * @throws {Error} When using `"any"`, and no link was able to be parsed.
	 */
	parseLink(link: Link, type: ParserName | "auto" = "auto"): string | null {
		if (typeof link !== "string" || typeof type !== "string") {
			throw new TypeError("Link parser: Both link and type must be string");
		}
		else if (type !== "auto" && !this.#parsers.get(type)) {
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
			return this.#parsers.get(type)?.parseLink(link) ?? null;
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
	checkValid(link: Link, type: ParserName | "auto" = "auto") {
		if (typeof link !== "string" || typeof type !== "string") {
			throw new TypeError("Link parser: Both link and type must be string");
		}
		else if (!this.#parsers.get(type)) {
			throw new Error("Link parser: No parser exists for type " + type);
		}

		return this.#parsers.get(type)?.checkLink(link, false); // noURL wasn't passed before. TODO: ask supi about it
	}

	/**
	 * Determines if a link is still available on the provided website, or checks all parsers.
	 * @param {string} link
	 * @param {LinkParserName|"auto"} type = "auto"
	 * @returns {boolean}
	 * @throws {TypeError} If `link` or `type` is not a string.
	 * @throws {Error} If no such parser exists for `type`.
	 */
	async checkAvailable(link: Link, type: ParserName | "auto" = "auto") {
		if (typeof link !== "string" || typeof type !== "string") {
			throw new TypeError("Link parser: Both link and type must be string");
		}
		else if (type !== "auto" && !this.#parsers.get(type)) {
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
			const parsedLink = this.#parsers.get(type)!.parseLink(link);
			if (parsedLink) {
				return await this.#parsers.get(type)!.checkAvailable(parsedLink);
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
	async fetchData(link: Link, type: ParserName | "auto" = "auto") {
		if (typeof link !== "string" || typeof type !== "string") {
			throw new TypeError("Link parser: Both link and type must be string");
		}
		else if (type !== "auto" && !this.#parsers.get(type)) {
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
			return await this.#parsers.get(type)!.fetchData(link);
		}
	}

	/**
	 * Reloads a parser, based on its name.
	 * @param {LinkParserName} parser
	 * @param {Object} options Options required for the specific parser
	 * @returns {boolean} Determines the success of the reload operation
	 * @throws {Error} If invalid parser name is provided.
	 */
	reloadParser(parser: ParserName, options = {}) {
		const constructor = parserConstructors.get(parser);
		if (!constructor) {
			throw new Error("Invalid constructor name provided");
		}

		try {
			this.#parsers.set(parser, new constructor(options));
			this.#options.set(parser, options);
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
	getParser(parser: ParserName) {
		return this.#parsers.get(parser);
	}
};
