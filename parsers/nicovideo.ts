import { Template, GenericLinkParserResponse } from "./template.js";
import { parse as parseXml } from "fast-xml-parser";

type NicovideoTag = string | { _lock: string; __text: string; };
type NicovideoApiResponse = {
	comment_num: string;
	description: string;
	first_retrieve: string;
	genre: string;
	last_res_body: string;
	length: string;
	movie_type: string;
	mylist_counter: string;
	no_live_play: string;
	size_high: string;
	size_low: string;
	tags: {
		tag: NicovideoTag[];
		_domain: string;
	};
	thumb_type: string;
	thumbnail_url: string;
	title: string;
	user_icon_url: string;
	user_id: string;
	user_nickname: string;
	video_id: string;
	view_counter: string;
	watch_url: string;
};
type NicovideoApiWrapper = {
	nicovideo_thumb_response: {
		thumb: NicovideoApiResponse;
		_status: string;
		error?: string;
	};
};

interface NicovideoResponse extends GenericLinkParserResponse {
	extra: {
		tags: string[]
	};
}

const nicovideoFetch = async (videoId: string) => {
	const url = new URL(`https://ext.nicovideo.jp/api/getthumbinfo/${videoId}`);
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
		if (!response.ok) {
			return false;
		}

		const xml = await response.text();
		const rawData = parseXml(xml) as NicovideoApiWrapper;
		const data = rawData.nicovideo_thumb_response;

		return (!data.error);
	}

	async fetchData (videoID: string): Promise<NicovideoResponse | null> {
		const response = await nicovideoFetch(videoID);
		if (!response.ok) {
			return null;
		}

		const xml = await response.text();
		const rawData = parseXml(xml) as NicovideoApiWrapper;
		const wrapData = rawData.nicovideo_thumb_response;
		if (wrapData.error) {
			return null;
		}

		const data = wrapData.thumb;
		return {
			type: "nicovideo",
			ID: data.video_id,
			link: `https://www.nicovideo.jp/watch/${data.video_id}`,
			name: data.title,
			author: (data.user_nickname === null)
				? null
				: String(data.user_nickname),
			authorID: data.user_id,
			description: data.description,
			duration: data.length.split(":").map(Number).reduce((acc, cur, ind) => (ind === 0) ? acc + cur * 60 : acc + cur, 0),
			created: new Date(data.first_retrieve),
			views: (data.view_counter) ? Number(data.view_counter) : null,
			comments: (data.comment_num) ? Number(data.comment_num) : null,
			likes: (data.mylist_counter) ? Number(data.mylist_counter) : null,
			thumbnail: data.thumbnail_url || null,
			extra: {
				tags: (data.tags)
					? data.tags.tag.map(i => (typeof i === "string") ? i : i.__text)
					: []
			}
		};
	}
};
