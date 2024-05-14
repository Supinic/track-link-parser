import {
	LinkParser,
	Response,
	ExtraData
} from "./template.js";

export interface DailymotionData extends ExtraData {
	explicit: boolean;
	tags: string[];
}
export interface DailymotionResponse extends Response {
	extra: DailymotionData;
}

const urlRegex = /(dailymotion\.com\/video\/|dai\.ly\/)([kx][a-z0-9]{5,6})/;
const noUrlRegex = /^[kx][a-z0-9]{5,6}$/;
const searchParams = new URLSearchParams({
	fields: [
		"created_time",
		"description",
		"duration",
		"explicit",
		"id",
		"likes_total",
		"owner",
		"owner.screenname",
		"private",
		"tags",
		"thumbnail_url",
		"title",
		"views_total",
		"url"
	].join(",")
});

type LocalDailymotionResponse = {
	id: string;
	title: string;
	"owner.screenname": string | null;
	owner: string | number | null;
	description: string | null;
	created_time: number | null;
	duration: number | null;
	views_total: number | null;
	likes_total: number | null;
	thumbnail_url: string | null;
	explicit: boolean;
	tags: string[];
};
type LocalDailymotionCommentsResponse = {
	page: number;
	limit: number;
	explicit: boolean;
	total: number;
	has_more: boolean;
	list: string[];
};

const fetchVideoData = async (videoID: string) => {
	try {
		const response = await fetch(`https://api.dailymotion.com/video/${videoID}${searchParams}`);
		const json = await response.json();
		return json as LocalDailymotionResponse;
	}
	catch {
		return null;
	}
};

const fetchCommentsData = async (videoID: string) => {
	try {
		const response = await fetch(`https://api.dailymotion.com/video/${videoID}/comments`);
		const json = await response.json();
		return json as LocalDailymotionCommentsResponse;
	}
	catch {
		return null;
	}
};

export class DailymotionParser extends LinkParser {
	readonly name = "dailymotion";

	checkLink (link: string, noURL: boolean): boolean {
		if (noURL) {
			return noUrlRegex.test(link);
		}
		else {
			return urlRegex.test(link);
		}
	}

	parseLink (url: string): string | null {
		return url.match(urlRegex)?.[2] ?? null;
	}

	async checkAvailable (videoID: string): Promise<boolean> {
		const response = await fetch(`https://api.dailymotion.com/video/${videoID}`);
		return (response.status === 200);
	}

	async fetchData (videoID: string): Promise<DailymotionResponse | null> {
		const [data, commentsData] = await Promise.all([
			fetchVideoData(videoID),
			fetchCommentsData(videoID)
		]);

		if (!data || !commentsData) {
			return null;
		}

		return {
			ID: data.id,
			link: `https://dailymotion.com/${data.id}`,
			name: data.title,
			author: data["owner.screenname"],
			authorID: data.owner,
			description: (data.description !== "") ? data.description : null,
			created: (data.created_time) ? new Date(data.created_time * 1000) : null,
			duration: data.duration,
			views: data.views_total ?? null,
			comments: commentsData.total ?? null,
			likes: data.likes_total ?? null,
			thumbnail: data.thumbnail_url ?? null,
			extra: {
				explicit: data.explicit,
				tags: data.tags
			}
		};
	}
}
