import { KeyOptions, Template, GenericLinkParserResponse } from "./template.js";

interface YoutubeParserResponse extends GenericLinkParserResponse {
	extra: {
		favourites: number;
		rawLength: YoutubeItem["contentDetails"]["duration"];
		tags: YoutubeItem["snippet"]["tags"];
		privacy: YoutubeItem["status"]["privacyStatus"];
	};
}

type ElementType <T extends ReadonlyArray<unknown>> = T extends ReadonlyArray<infer ElementType>
	? ElementType
	: never;

const thumbnailSizes = ["maxres", "high", "medium", "small", "default"] as const;
type ThumbnailData = {
	url: string;
	width: number;
	height: number;
};

type YoutubeItem = {
	etag: string;
	id: string;
	kind: string;
	contentDetails: {
		captions: "false" | "true";
		contentRating: unknown;
		definition: string;
		dimension: "2d" | "3d";
		duration: string;
		licensedContent: boolean;
		projection: string;
	};
	snippet: {
		categoryId: string;
		channelId: string;
		channelTitle: string;
		defaultAudioLanguage: string;
		description: string;
		liveBroadcastContent: string;
		localized: {
			description: string;
			title: string;
		};
		publishedAt: string;
		tags: string[];
		thumbnails: Record<ElementType<typeof thumbnailSizes>, ThumbnailData>;
		title: string;
	};
	statistics: {
		viewCount: string;
		favoriteCount: string;
		likeCount: string;
		commentCount: string;
	};
	status: {
		embeddable: boolean;
		license: string;
		madeForKids: boolean;
		privacyStatus: string;
		publicStatsViewable: boolean;
		uploadStatus: string;
	};
};
type YoutubeApiResult = {
	etag: string;
	kind: string;
	pageInfo: {
		totalResult: number;
		resultsPerPage: number;
	};
	items: YoutubeItem[];
};

const durationRegex = /P((?<days>\d+)D)?(T((?<hours>\d+)H)?((?<minutes>\d+)M)?((?<seconds>\d+)S)?)?/;
const noUrlRegex = /^[a-zA-z0-9\-_]{11}$/;
const patterns = [
	/youtu\.be\/([a-zA-z0-9\-_]{11})/, // youtu.be/<id>
	/\?v=([a-zA-z0-9\-_]{11})/, // ?v=<id>
	/&v=([a-zA-z0-9\-_]{11})/, // &v=<id>
	/embed\/([a-zA-z0-9\-_]{11})/, // embed/<id>
	/\/v\/([a-zA-z0-9\-_]{11})/, // /v/<id>
	/video_id=([a-zA-z0-9\-_]{11})/// https://www.youtube.com/get_video_info?video_id=2n9_RiWB6pc
] as const;

const parts = ["contentDetails", "snippet", "status", "statistics"].join(",");
const baseUrl = new URL("https://www.googleapis.com/youtube/v3/videos");

export default class YoutubeParser extends Template {
	#key: string;

	constructor (options: KeyOptions) {
		super();
		this.#key = options.key;
	}

	checkLink (link: string, noURL: boolean) {
		if (noURL) {
			return noUrlRegex.test(link);
		}
		else {
			return Boolean(this.parseLink(link));
		}
	}

	/**
	 * Matches a YouTube video ID.
	 */
	parseLink (url: string) {
		for (const pattern of patterns) {
			const match = url.match(pattern);
			if (match) {
				return match[1];
			}
		}

		return null;
	}

	async checkAvailable (videoID: string) {
		const url = new URL(baseUrl);
		url.search = new URLSearchParams({
			id: videoID,
			key: this.#key,
			part: parts
		}).toString();

		const response = await fetch(url, { method: "GET" });
		const data = await response.json() as YoutubeApiResult;

		return data.items.some(i => i.id === videoID);
	}

	async fetchData (videoID: string): Promise<YoutubeParserResponse | null> {
		const url = new URL(baseUrl);
		url.search = new URLSearchParams({
			id: videoID,
			key: this.#key,
			part: parts
		}).toString();

		const response = await fetch(url, { method: "GET" });
		const rawData = await response.json() as YoutubeApiResult;
		const data = rawData.items.find(i => i.id === videoID);
		if (!data) {
			return null;
		}

		return {
			type: "youtube",
			ID: data.id,
			link: `https://youtu.be/${data.id}`,
			name: data.snippet.title,
			author: data.snippet.channelTitle,
			authorID: data.snippet.channelId,
			description: data.snippet.description,
			created: new Date(data.snippet.publishedAt),
			duration: (data.contentDetails.duration === "P0D")
				? null
				: YoutubeParser.parseDuration(data.contentDetails.duration),
			views: Number(data.statistics.viewCount),
			comments: Number(data.statistics.commentCount),
			likes: Number(data.statistics.likeCount),
			thumbnail: YoutubeParser.pickBestThumbnail(data.snippet.thumbnails),
			extra: {
				favourites: Number(data.statistics.favoriteCount),
				rawLength: data.contentDetails.duration,
				tags: data.snippet.tags,
				privacy: data.status.privacyStatus
			}
		};
	}

	/**
	 * Parses a ISO-8601 duration string to a number representing the time in seconds
	 */
	static parseDuration (string: string) {
		const match = string.match(durationRegex);
		if (!match || !match.groups) {
			throw new Error("Could not match duration groups");
		}

		const { days, hours, minutes, seconds } = match.groups;
		return Number(days ?? 0) * 86400
			+ Number(hours ?? 0) * 3600
			+ Number(minutes ?? 0) * 60
			+ Number(seconds ?? 0);
	}

	/**
	 * Picks the best possible thumbnail resolution from a data object.
	 */
	static pickBestThumbnail (data: YoutubeItem["snippet"]["thumbnails"]) {
		for (const size of thumbnailSizes) {
			if (data[size]) {
				return data[size].url;
			}
		}

		return null;
	}
};
