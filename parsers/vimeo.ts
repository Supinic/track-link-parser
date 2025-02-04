import { Template, GenericLinkParserResponse } from "./template.js";

type VimeoApiResponse = {
	description: string;
	embed_privacy: string;
	duration: number;
	height: number;
	id: number;
	stats_number_of_comments: number;
	stats_number_of_likes: number;
	stats_number_of_plays: number;
	tags: string;
	thumbnail_large: string;
	thumbnail_medium: string;
	thumbnail_small: string;
	title: string;
	upload_date: string;
	url: string;
	user_id: number;
	user_name: string;
	user_portrait_huge: string;
	user_portrait_large: string;
	user_portrait_medium: string;
	user_portrait_small: string;
	width: number;
}[];

const urlRegex = /vimeo\.com\/(\d+)/;
const noUrlRegex = /(\d{8,9})/;

const vimeoFetch = async (videoID: string) => {
	const url = `https://vimeo.com/api/v2/video/${videoID}.json`;
	return await fetch(url);
};

export default class VimeoParser extends Template {
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
		const response = await vimeoFetch(videoID);
		return response.ok;
	}

	async fetchData (videoID: string): Promise<GenericLinkParserResponse | null> {
		const response = await vimeoFetch(videoID);
		if (!response.ok) {
			return null;
		}

		const rawData = await response.json() as VimeoApiResponse;
		const [data] = rawData;
		return {
			type: "vimeo",
			ID: String(data.id),
			link: data.url,
			name: data.title,
			author: data.user_name,
			authorID: `user${data.user_id}`,
			description: data.description,
			duration: data.duration,
			created: new Date(data.upload_date),
			views: data.stats_number_of_plays,
			comments: data.stats_number_of_comments,
			likes: data.stats_number_of_likes,
			thumbnail: data.thumbnail_large ?? data.thumbnail_medium ?? data.thumbnail_small ?? null,
			extra: {}
		};
	}
};
