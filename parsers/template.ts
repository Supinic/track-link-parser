export interface ExtraData { }
export interface GenericParserOptions { }

export type Name = string;
export interface Response {
	// /** Name of the website the parser used */
	// type: Name;
	/** Media ID */
	ID: string;
	/** link Full media URL */
	link: string;
	/** Media name as it appears on the website */
	name: string;
	/** Media author's name, if any exists */
	author: string | null;
	/** Only available if the media author exists and the website uses author IDs */
	authorID: string | number | null;
	/** Media description - as the author describes it */
	description: string | null;
	/** Length of the media, expressed in seconds. Can be integer or float, depending on site */
	duration: number | null;
	/** Date of the media's publishing to the website */
	created: Date | null;
	/** Amount of cumulative viewers, if supported */
	views: number | null;
	/** Amount of comments, if supported */
	comments: number | null;
	/** Amount of likes, if supported */
	likes: number | null;
	/** Video thumbnail URL, if available */
	thumbnail: string | null;
	/** Website-specific extra data, as defined per-parser instance */
	extra: ExtraData;
}

export abstract class LinkParser {
	abstract readonly name: string;

	/**
	 * Returns a boolean determining if a given URL belongs to the media website a parser instance governs.
	 * @param link Input link to check.
	 * @param noURL If true, the input provided is considered just the media ID - and not a full URL.
	 * @throws {Error} If the parser cannot determine the result - only if `noURL` is true
	 */
	abstract checkLink (link: string, noURL: boolean): boolean;

	/**
	 * For a given URL, attempts to parse out the media ID.
	 * Returns `null` if no ID was found.
	 */
	abstract parseLink (link: string): string | null;

	/**
	 * Returns a boolean determining if a given media ID is still available on the website.
	 */
	abstract checkAvailable (link: string): Promise<boolean>;

	/**
	 * For a given media file ID, fetches a (mostly) standardized response that describes the media.
	 */
	abstract fetchData (mediaID: string): Promise<Response | null>;
}
