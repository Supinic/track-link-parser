import { Template, GenericLinkParserResponse } from "./template.js";

type DailymotionApiResponse = {
	created_time: number;
	description: string;
	duration: number;
	explicit: boolean;
	id: string;
	likes_total: number;
	owner: string;
	"owner.screenname": string;
	private: boolean;
	tags: string[];
	thumbnail_url: string;
	title: string;
	views_total: number;
};
type DailymotionCommentsResponse = {
	explicit: boolean;
	has_more: boolean;
	limit: number;
	list: unknown[];
	page: number;
	total: number;
};

interface DailymotionResponse extends GenericLinkParserResponse {
	extra: {
		explicit: DailymotionApiResponse["explicit"];
		tags: DailymotionApiResponse["tags"];
	};
}

const urlRegex = /(dailymotion\.com\/video\/|dai\.ly\/)([kx][a-z0-9]{5,6})/;
const noUrlRegex = /^[kx][a-z0-9]{5,6}$/;

const dataFields = [
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
].join(",");

const simpleDailymotionFetch = async (videoId: string) => {
	return await fetch(`https://api.dailymotion.com/video/${videoId}`);
};
const dailymotionFetch = async (videoId: string) => {
	const commentsUrl = new URL(`https://api.dailymotion.com/video/${videoId}/comments`);
	const apiUrl = new URL(`https://api.dailymotion.com/video/${videoId}`);
	apiUrl.search = new URLSearchParams({
		fields: dataFields
	}).toString();

	const [apiResponse, commentsResponse] = await Promise.all([fetch(apiUrl), fetch(commentsUrl)]);
	if (!apiResponse.ok || !commentsResponse.ok) {
		return null;
	}

	const [apiData, commentsData] = await Promise.all([apiResponse.json(), commentsResponse.json()]);
	return {
		data: apiData as DailymotionApiResponse,
		comments: commentsData as DailymotionCommentsResponse
	};
};

export default class DailymotionParser extends Template {
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

	async checkAvailable (videoId: string) {
		const response = await simpleDailymotionFetch(videoId);
		return response.ok;
	}

	async fetchData (videoId: string): Promise<null | DailymotionResponse> {
		const apiData = await dailymotionFetch(videoId);
		if (!apiData) {
			return null;
		}

		const { data, comments } = apiData;
		return {
			type: "dailymotion",
			ID: data.id,
			link: `https://dailymotion.com/${data.id}`,
			name: data.title,
			author: data["owner.screenname"],
			authorID: data.owner,
			description: (data.description !== "") ? data.description : null,
			created: (data.created_time) ? new Date(data.created_time * 1000) : null,
			duration: data.duration,
			views: data.views_total ?? null,
			comments: comments.total ?? null,
			likes: data.likes_total ?? null,
			thumbnail: data.thumbnail_url ?? null,
			extra: {
				explicit: data.explicit,
				tags: data.tags
			}
		};
	}
};
