import got from "got";
import {
	LinkParser,
	Response,
	ExtraData
} from "./template.js";

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
];

export interface DailymotionData extends ExtraData {
	explicit: boolean;
	tags: string[];
}
export interface DailymotionResponse extends Response {
	extra: DailymotionData;
}

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

export class DailymotionParser extends LinkParser {
	static readonly name = "dailymotion";

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
		const { statusCode } = await got({
			url: `https://api.dailymotion.com/video/${videoID}`,
			throwHttpErrors: false
		});

		return (statusCode === 200);
	}

	async fetchData (videoID: string): Promise<DailymotionResponse | null> {
		let videoData;
		let commentsData: any;
		try {
			[videoData, commentsData] = await Promise.all([
				got({
					url: `https://api.dailymotion.com/video/${videoID}`,
					searchParams: {
						fields: dataFields.join(",")
					}
				}).json(),
				got(`https://api.dailymotion.com/video/${videoID}/comments`).json()
			]);

		}
		catch {
			return null;
		}

		const data = videoData as LocalDailymotionResponse;
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
