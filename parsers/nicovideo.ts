import { Template, GenericLinkParserResponse } from "./template.js";

type NicovideoApiResponse = {
	ads: unknown;
	category: unknown;
	channel: unknown;
	client: Record<string, unknown>;
	comment: Record<string, unknown>;
	community: unknown;
	easyComment: {
		phrases: {
			nicodic: {
				link: string;
				summary: string;
				title: string;
				viewTitle: string;
			};
			text: string;
		}[];
	};
	external: unknown;
	genre: {
		isDisabled: boolean;
		isImmoral: boolean;
		isNotSet: boolean;
		key: string;
		label: string;
	};
	marquee: unknown;
	media: Record<string, unknown>;
	okReason: string;
	owner: {
		channel: unknown;
		iconUrl: string;
		id: number;
		isMyListsPublice: boolean;
		isVideosPublice: boolean;
		live: boolean | null;
		nickname: string;
		videoLiveNotice: unknown;
		viewer: number | null;
	};
	payment: Record<string, unknown>;
	pcWatchPage: unknown;
	player: Record<string, unknown>;
	ppv: unknown;
	ranking: {
		genre: string | null;
		popularTag: unknown[];
	};
	series: unknown;
	smartphone: unknown;
	system: Record<string, unknown>;
	tag: {
		edit: {
			editKey: unknown;
			isEditable: boolean;
			uneditableReason: string;
		};
		hasR18Tag: boolean;
		isPublishedNicoscript: boolean;
		items: {
			name: string;
			isCategory: boolean;
			isCategoryCandidate: boolean;
			isLocked: boolean;
			isNicodicArticleExists: boolean;
		}[];
	};
	video: {
		"9d091f87": boolean;
		commentableUserTypeForPayment: string;
		count: {
			view: number;
			comment: number;
			mylist: number;
			like: number;
		};
		description: string;
		duration: number;
		id: string;
		isAuthenticationRequired: boolean;
		isDeleted: boolean;
		isEmbedPlayerAllowed: boolean;
		isGiftAllowed: boolean;
		isNoBanner: boolean;
		isPrivate: boolean;
		rating: {
			isAdult: boolean;
		};
		registeredAt: string;
		thumbnail: {
			ogp: string;
			player: string;
			url: string;
			middleUrl: string | null;
			largeUrl: string | null;
		};
		title: string;
		viewer: unknown;
		watchableUserTypeForPayment: string;
	};
	videoAds: Record<string, unknown>;
	videoLive: unknown;
	viewer: unknown;
	waku: Record<string, unknown>;
};
type NicovideoApiWrapper = {
	meta: {
		status: number;
	};
	data: NicovideoApiResponse;
};

interface NicovideoResponse extends GenericLinkParserResponse {
	extra: {
		genre: NicovideoApiResponse["genre"]["key"];
		nsfw: boolean;
		tags: string[];
	};
}

const baseUrl = "https://www.nicovideo.jp/api/watch/v3_guest";
const nicovideoFetch = async (videoId: string) => {
	// The Nicovideo API expects a random numerical value - use Date.now() to generate a pseudo-random sequence.
	const randomPart = Date.now().toString();
	const url = new URL(`${baseUrl}/${videoId}`);
	url.search = new URLSearchParams({
		_frontendId: "6",
		_frontendVersion: "0",
		actionTrackId: `AAAAAAAAAA_${randomPart}`
	}).toString();

	return await fetch(url);
};

const urlRegex = /nicovideo\.jp\/watch\/([s|n]m\d+)/;
const noUrlRegex = /(s|nm\d{7,9})/;

export default class NicovideoParser extends Template {
	parseLink (link: string) {
		const match = link.match(urlRegex);
		return match ? match[1] : null;
	}

	checkLink (link: string, noURL: boolean) {
		if (noURL) {
			return noUrlRegex.test(link);
		}
		else {
			return urlRegex.test(link);
		}
	}

	async checkAvailable (videoID: string) {
		const response = await nicovideoFetch(videoID);
		return response.ok;
	}

	async fetchData (videoID: string): Promise<NicovideoResponse | null> {
		const response = await nicovideoFetch(videoID);
		if (!response.ok) {
			return null;
		}

		const { data } = await response.json() as NicovideoApiWrapper;
		return {
			type: "nicovideo",
			ID: data.video.id,
			link: `https://www.nicovideo.jp/watch/${data.video.id}`,
			name: data.video.title,
			author: data.owner.nickname,
			authorID: data.owner.id,
			description: data.video.description,
			duration: data.video.duration,
			created: new Date(data.video.registeredAt),
			views: data.video.count.view,
			comments: data.video.count.comment,
			likes: data.video.count.like,
			thumbnail: data.video.thumbnail.url,
			extra: {
				genre: data.genre.key,
				nsfw: data.video.rating.isAdult,
				tags: data.tag.items.map(i => i.name)
			}
		};
	}
};
