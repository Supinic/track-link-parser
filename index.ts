import type { Template as TemplateParser, KeyOptions } from "./parsers/template.js";
export type { KeyOptions } from "./parsers/template.js";

import BilibiliParser from "./parsers/bilibili.js";
import DailymotionParser from "./parsers/dailymotion.js";
import NicovideoParser from "./parsers/nicovideo.js";
import SoundcloudParser from "./parsers/soundcloud.js";
import VimeoParser from "./parsers/vimeo.js";
import YoutubeParser from "./parsers/youtube.js";

const PARSER_CONSTRUCTORS = {
	bilibili: BilibiliParser,
	dailymotion: DailymotionParser,
	nicovideo: NicovideoParser,
	soundcloud: SoundcloudParser,
	vimeo: VimeoParser,
	youtube: YoutubeParser
} as const;

type ParserName = keyof typeof PARSER_CONSTRUCTORS;
type TrackLinkParserOptions = Partial<{
	soundcloud: KeyOptions;
	youtube: KeyOptions;
}>;

/**
 * Wrapper that holds several link parsers, where each of them works with a different media-file sharing website in order
 * to fetch, process and parse media data into a standardized format.
 */
export default class TrackLinkParser {
	readonly #parsers: Partial<Record<ParserName, TemplateParser>> = {
		bilibili: new BilibiliParser(),
		dailymotion: new DailymotionParser(),
		nicovideo: new NicovideoParser(),
		vimeo: new VimeoParser()
	};

	constructor (options: TrackLinkParserOptions = {}) {
		if (options.soundcloud) {
			this.#parsers.soundcloud = new SoundcloudParser(options.soundcloud);
		}
		else {
			console.warn("Soundcloud options not provided - parser will not be available");
		}

		if (options.youtube) {
			this.#parsers.youtube = new YoutubeParser(options.youtube);
		}
		else {
			console.warn("YouTube options not provided - parser will not be available");
		}
	}

	/**
	 * Attempts to detect the host of a media link.
	 * @returns If no media host was detected, returns `null`.
	 */
	autoRecognize (link: string): ParserName | null {
		for (const [rawType, parser] of Object.entries(this.#parsers)) {
			const type = rawType as ParserName;
			if (parser.parseLink(link)) {
				return type;
			}
		}

		return null;
	}

	/**
	 * Attempts to fetch the media file ID from a URL, either through a provided parser type, or automatically.
	 * @param link Media link to be parsed
	 * @param type Specific parser name. If not filled out or "auto", the first applicable parser will be used.
	 * and the first proper value will be returned.
	 */
	parseLink (link: string, type: ParserName | "auto" = "auto"): string | null {
		if (type !== "auto") {
			const parser = this.#parsers[type];
			if (!parser) {
				throw new Error(`Parser ${type} is not initialized`);
			}

			return parser.parseLink(link);
		}

		for (const parser of Object.values(this.#parsers)) {
			const parsedLink = parser.parseLink(link);
			if (parsedLink) {
				return parsedLink;
			}
		}

		throw new Error("Cannot auto-parse link - no applicable parsers");
	}

	/**
	 * Determines if a link is valid for the provided website parser.
	 */
	checkValid (link: string, type: ParserName) {
		const parser = this.#parsers[type];
		if (!parser) {
			throw new Error(`Parser ${type} is not initialized`);
		}

		return parser.checkLink(link, false);
	}

	/**
	 * Determines if a link is still available on the provided website, or checks all parsers.
	 * @param link Media link to be checked
	 * @param type Specific parser name. If not filled out or "auto", the first applicable parser will be used.
	 */
	async checkAvailable (link: string, type: ParserName | "auto" = "auto") {
		if (type !== "auto") {
			const parser = this.#parsers[type];
			if (!parser) {
				throw new Error(`Parser ${type} is not initialized`);
			}

			const parsedLink = parser.parseLink(link);
			if (!parsedLink) {
				throw new Error(`Cannot parse link for parser ${type}`);
			}

			return await parser.checkAvailable(parsedLink);
		}


		for (const parser of Object.values(this.#parsers)) {
			const parsedLink = parser.parseLink(link);
			if (parsedLink) {
				return await parser.checkAvailable(parsedLink);
			}
		}

		throw new Error("Cannot auto-check link - no applicable parsers");
	}

	/**
	 * Fetches the media full data for a provided URL.
	 */
	async fetchData (link: string, type: ParserName | "auto" = "auto") {
		if (type !== "auto") {
			const parser = this.#parsers[type];
			if (!parser) {
				throw new Error(`Parser ${type} is not initialized`);
			}

			return await parser.fetchData(link);
		}

		for (const parser of Object.values(this.#parsers)) {
			const parsedLink = parser.parseLink(link);
			if (parsedLink) {
				return await parser.fetchData(parsedLink);
			}
		}

		throw new Error("Cannot auto-fetch link - no applicable parsers");
	}

	/**
	 * Reloads a parser, based on its name.
	 */
	reloadParser (type: "soundcloud" | "youtube", options: KeyOptions) {
		const Builder = PARSER_CONSTRUCTORS[type];
		try {
			this.#parsers[type] = new Builder(options);
			return true;
		}
		catch (e) {
			console.error(e);
			return false;
		}
	}

	getParser (type: "bilibili"): BilibiliParser;
	getParser (type: "dailymotion"): DailymotionParser;
	getParser (type: "nicovideo"): NicovideoParser;
	getParser (type: "soundcloud"): SoundcloudParser;
	getParser (type: "vimeo"): VimeoParser;
	getParser (type: "youtube"): YoutubeParser;

	/**
	 * Fetches a parser instance by its name.
	 */
	getParser (type: ParserName): TemplateParser | undefined {
		return this.#parsers[type];
	}
};
