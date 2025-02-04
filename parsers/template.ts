type LinkParserName = "bilibili" | "dailymotion" | "nicovideo" | "soundcloud" | "vimeo" | "vk" | "youtube";

type SimpleData = string | number | null | boolean | { [P: string]: SimpleData } | SimpleData[];
type CustomParserData = Record<string, SimpleData>;

export type KeyOptions = {
	key: string;
};

export interface GenericLinkParserResponse {
	type: LinkParserName;
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
	extra: CustomParserData;
}

export abstract class Template {
	/**
	 * Returns a boolean determining if a given URL belongs to the media website a parser instance governs.
	 * @param link Input link to check.
	 * @param noURL If true, the input provided is considered just the media ID - and not a full URL.
	 */
	abstract checkLink (link: string, noURL: boolean): boolean;

	/**
	 * For a given URL, attempts to parse out the media ID. Returns `null` if no ID was found.
	 */
	abstract parseLink (link: string): string | null;

	/**
	 * Returns a boolean determining if a given media ID is still available on the website.
	 */
	abstract checkAvailable (link: string): Promise<boolean>;

	/**
	 * For a given media file ID, fetches a (mostly) standardized response that describes the media.
	 */
	abstract fetchData (mediaID: string): Promise<GenericLinkParserResponse | null>;
}
