import { KeyOptions, Template, GenericLinkParserResponse } from "./template.js";

type Transcoding = {
	duration: number;
	format: {
		protocol: string;
		mime_type: string;
	};
	is_legacy_transcoding: boolean;
	preset: string;
	quality: string;
	snipped: boolean;
	url: string;
};
type SoundcloudUser = {
	avatar_url: string;
	badges: Record<string, boolean>;
	city: string;
	comments_count: number;
	country_code: string | null;
	created_at: string;
	creator_subscription: {
		product: { id: string; };
	};
	creator_subscriptions: SoundcloudUser["creator_subscription"][];
	description: string;
	first_name: string;
	followers_count: number;
	followings_count: number;
	full_name: string;
	groups_count: number;
	id: number;
	kind: string;
	last_modified: string;
	last_name: string;
	likes_count: number;
	permalink: string;
	permalink_url: string;
	playlist_count: number;
	playlist_likes_count: number;
	reposts_count: number | null;
	station_permalink: string;
	station_url: string;
	track_url: number;
	uri: string;
	urn: string;
	username: string;
	verified: boolean;
	visuals: {
		enabled: boolean;
		tracking: unknown;
		urn: string;
		visuals: {
			entry_time: number;
			urn: string;
			visual_url: string;
		}[];
	}
};
type SoundcloudApiResponse = {
	artwork_url: string;
	caption: string | null;
	comment_count: number;
	commentable: boolean;
	created_at: string;
	description: string;
	display_date: string;
	download_count: number;
	downloadable: boolean;
	duration: number;
	embeddable_by: string;
	full_duration: number;
	genre: string | null;
	has_downloads_left: boolean;
	id: number;
	kind: string;
	label_name: string | null;
	last_modified: string;
	license: string;
	likes_count: number;
	media: {
		transcodings: Transcoding[];
	};
	monetization_model: string;
	permalink: string;
	permalink_url: string;
	playback_count: number;
	policy: string;
	public: boolean;
	publisher_metadata: string | null;
	purchase_title: string | null;
	purchase_url: string | null;
	release_date: string | null;
	reposts_count: number | null;
	secret_token: string | null;
	sharing: string;
	state: string;
	station_permalink: string;
	station_urn: string;
	streamable: boolean;
	tag_list: string;
	title: string;
	track_authorization: string;
	uri: string;
	urn: string;
	user: SoundcloudUser;
	user_id: number;
	visuals: string | null;
	waveform_url: string;
};

interface SouncloudResponse extends GenericLinkParserResponse {
	extra: {
		apiID: SoundcloudApiResponse["id"];
		waveform: SoundcloudApiResponse["waveform_url"];
		monetization: SoundcloudApiResponse["monetization_model"];
		genre: SoundcloudApiResponse["genre"];
		reposts: SoundcloudApiResponse["reposts_count"];
	};
}

const soundcloudFetch = async (videoUrl: string, key: string) => {
	const url = new URL("https://api-v2.soundcloud.com/resolve");
	url.search = new URLSearchParams({
		url: videoUrl,
		client_id: key
	}).toString();

	return await fetch(url);
};

export default class SoundcloudParser extends Template {
	readonly #key: string;

	constructor (options: KeyOptions) {
		super();
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

	async checkAvailable (videoUrl: string) {
		const response = await soundcloudFetch(videoUrl, this.#key);
		return response.ok;
	}

	async fetchData (videoUrl: string): Promise<SouncloudResponse | null> {
		const response = await soundcloudFetch(videoUrl, this.#key);
		if (!response.ok) {
			return null;
		}

		const data = await response.json() as SoundcloudApiResponse;
		return {
			type: "soundcloud",
			ID: videoUrl,
			link: data.permalink_url,
			name: data.title,
			author: data.user?.username ?? null,
			authorID: data.user?.permalink ?? null,
			description: data.description ?? null,
			duration: data.duration / 1000,
			created: new Date(data.created_at),
			views: data.playback_count ?? null,
			comments: data.comment_count ?? null,
			likes: data.likes_count ?? null,
			thumbnail: data.artwork_url ?? null,
			extra: {
				apiID: data.id,
				waveform: data.waveform_url,
				monetization: data.monetization_model,
				genre: data.genre ?? null,
				reposts: data.reposts_count ?? null
			}
		};
	}
};
