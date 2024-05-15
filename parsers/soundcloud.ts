import {
	LinkParser,
	GenericParserOptions as BaseOptions,
	ExtraData,
	Response
} from "./template";

export interface SoundcloudOptions extends BaseOptions {
	key: string;
}
export interface SoundcloudData extends ExtraData {
	apiID: number;
	waveform: string;
	monetization: string;
	bpm: number | null;
	genre: string | null;
	reposts: number | null;
}
export interface SoundcloudResponse extends Response {
	extra: SoundcloudData;
}
type LocalSoundcloudResponse = {
	permalink_url: string;
	title: string;
	description: string | null;
	duration: number;
	created_at: string;
	playback_count: number | null;
	comment_count: number | null;
	favoritings_count?: number;
	artwork_url: string | null;
	user: {
		username: string;
		permalink: string | null;
	};
	id: number;
	waveform_url: string;
	monetization_model: string;
	bpm: number | null;
	genre: string | null;
	reposts_count: number | null;
	errors?: unknown;
};

const BASE_URL = "https://api-v2.soundcloud.com/resolve";

const fetchData = async (url: string, key: string): Promise<LocalSoundcloudResponse | null> => {
	try {
		const response = await fetch(`${BASE_URL}?url=${url}&client_id=${key}`);
		if (response.status !== 200) {
			return null;
		}

		return await response.json() as LocalSoundcloudResponse;
	}
	catch {
		return null;
	}
};

export class SoundcloudParser extends LinkParser {
	name = "soundcloud";
	#key: string;

	constructor (options: SoundcloudOptions) {
		super();

		if (!options.key) {
			throw new Error("Soundcloud parser: options.key is required");
		}

		this.#key = options.key;
	}

	parseLink (link: string) {
		if (link.includes("soundcloud.com/")) {
			return link;
		}
		else {
			return null;
		}
	}

	checkLink (link: string, noURL: boolean) {
		if (noURL) {
			throw new Error("Soundcloud parser: Cannot parse without full URL");
		}
		else {
			return link.includes("soundcloud.com/");
		}
	}

	async checkAvailable (link: string) {
		const data = await fetchData(link, this.#key);
		return Boolean(data && !data.errors);
	}

	async fetchData (link: string): Promise<SoundcloudResponse | null> {
		const data = await fetchData(link, this.#key);
		if (!data || data.errors) {
			return null;
		}

		return {
			ID: link,
			link: data.permalink_url,
			name: data.title,
			author: data.user.username,
			authorID: data.user.permalink ?? null,
			description: data.description ?? null,
			duration: data.duration / 1000,
			created: new Date(data.created_at),
			views: data.playback_count ?? null,
			comments: data.comment_count ?? null,
			likes: data.favoritings_count ?? null,
			thumbnail: data.artwork_url ?? null,
			extra: {
				apiID: data.id,
				waveform: data.waveform_url,
				monetization: data.monetization_model,
				bpm: data.bpm ?? null,
				genre: data.genre ?? null,
				reposts: data.reposts_count ?? null
			}
		};
	}
}

/**
 * @typedef {Object} SoundcloudParserData
 * @proeprty {number} apiID
 * @proeprty {string} waveform
 * @proeprty {string} monetization
 * @proeprty {number|null} bpm
 * @proeprty {string} genre
 * @proeprty {number} reposts
 */
