import {
	LinkParser,
	Name as ParserName,
	GenericParserOptions as Options,
	Response
} from "./parsers/template.js";

import { DailymotionParser } from "./parsers/dailymotion";

type LinkParserConstructor = { new(): LinkParser }; // Doesn't seem like a required constructor can be part of the abstract class?
const DEFAULT_PARSER_LIST: LinkParserConstructor[] = [DailymotionParser]; // @todo implement other parser in Typescript

export type Link = string;
type ParserMetaOptions = {
	list?: LinkParserConstructor[];
	// Maybe this can somehow map the specific parser type to its options (generic argument on LinkParser or something via its methods?)
	// parsers: {
	// 	[P in ParserName]?: Options; // @todo possible to map specific ParserName to its Parser.Options?
	// };
};

/**
 * Wrapper that holds several link parsers, where each of them works with a different media-file sharing website in order
 * to fetch, process and parse media data into a standardized format.
 */
export class ParserManager {
	#parsers: Map<ParserName, LinkParser> = new Map();

	constructor(options: ParserMetaOptions) {
		// For some reason accessing `list` throws even with the fallback?
		// const list = options.list ?? DEFAULT_PARSER_LIST;
		const list = DEFAULT_PARSER_LIST;
		for (const parserConstructor of list) {
			const parser = new parserConstructor();
			this.#parsers.set(parser.name, parser);
		}
	}

	/**
	 * Attempts to detect the website of a media link.
	 */
	autoRecognize(link: Link): ParserName | null {
		for (const [type, parser] of this.#parsers.entries()) {
			if (parser.parseLink(link)) {
				return type;
			}
		}

		return null;
	}

	/**
	 * Attempts to fetch the media file ID from a URL, either through a provided parser type, or automatically.
	 * @param link media URL
	 * @param type Specific parser name. If `"auto"`, every parser will be checked.
	 * and the first proper value will be returned.
	 */
	parseLink(link: Link, type: ParserName | "auto" = "auto"): string | null {
		if (type === "auto") {
			for (const parser of Object.values(this.#parsers)) {
				const parsedLink = parser.parseLink(link);
				if (parsedLink) {
					return parsedLink;
				}
			}

			throw new Error(`Cannot parse link ${link} - unable to parse`);
		}
		else {
			const parser = this.#parsers.get(type);
			return parser!.parseLink(link);
		}
	}

	/**
	 * Determines if a link is valid for the provided website parser.
	 * @param link media URL
	 * @param type Specific parser name.
	 */
	checkValid(link: Link, type: ParserName): boolean {
		const parser = this.#parsers.get(type);
		return parser!.checkLink(link, false);
	}

	/**
	 * Determines if a link is still available on the provided website, or checks all parsers.
	 * @param link media URL
	 * @param type Specific parser name. If `"auto"`, every parser will be checked.
	 */
	async checkAvailable(link: Link, type: ParserName | "auto" = "auto"): Promise<boolean> {
		if (type === "auto") {
			for (const parser of Object.values(this.#parsers)) {
				const parsedLink = parser.parseLink(link);
				if (parsedLink) {
					return await parser.checkAvailable(parsedLink);
				}
			}

			throw new Error(`Cannot check availability of link "${link}" - unable to parse`);
		}
		else {
			const parser = this.#parsers.get(type);
			const parsedLink = parser!.parseLink(link);
			if (parsedLink) {
				return await parser!.checkAvailable(parsedLink);
			}
			else {
				throw new Error(`Cannot check availability of link "${link}" - unable to parse for type " + ${type}`);
			}
		}
	}

	/**
	 * Fetches the full media data for a provided URL.
	 * @param link media URL
	 * @param type Specific parser name. If `"auto"`, every parser will be checked.
	 */
	async fetchData(link: Link, type: ParserName | "auto" = "auto"): Promise<Response | null> {
		if (type === "auto") {
			for (const parser of Object.values(this.#parsers)) {
				const parsedLink = parser.parseLink(link);
				if (parsedLink) {
					return await parser.fetchData(parsedLink);
				}
			}

			throw new Error(`Cannot auto-fetch data for link ${link} - unable to parse`);
		}
		else {
			const parser = this.#parsers.get(type);
			return await parser!.fetchData(link);
		}
	}

	/**
	 * Adjusts the options of a specific parser.
	 */
	// setOptions(parserName: ParserName, options: Options): void {
	// 	const parser = this.#parsers.get(parserName);
	// 	parser!.setOptions(options);
	// }

	/**
	 * Fetches a specific parser instance.
	 */
	getParser(parserName: ParserName): LinkParser {
		return this.#parsers.get(parserName) as LinkParser;
	}
}
