import { Template, GenericLinkParserResponse } from "./template.js";

interface BilibiliResponse extends GenericLinkParserResponse {
	extra: {
		aid: BilibiliApiResponse["aid"];
	};
}

type PseudoBoolean = 0 | 1;
type BilibiliApiResponse = {
	aid: number;
	argue_info: {
		argue_msg: string;
		argue_type: number;
		argue_link: string;
	};
	bvid: string;
	cid: number;
	copyright: number;
	ctime: number;
	desc: string;
	desc_v2: {
		raw_text: string;
		type: number;
		biz_id: number;
	}[];
	dimension: {
		width: number;
		height: number;
		rotate: number;
	};
	disable_show_up_info: boolean;
	duration: number;
	dynamic: string;
	enable_vt: PseudoBoolean;
	honor_reply: {
		honor: {
			aid: number;
			type: number;
			desc: string;
			weekly_recommended_num: number;
		}[];
	};
	is_chargeable_season: boolean;
	is_season_display: boolean;
	is_story: boolean;
	is_upower_exclusive: boolean;
	is_upower_play: boolean;
	is_upower_preview: boolean;
	is_story_play: PseudoBoolean;
	is_view_self: boolean;
	like_icon: string;
	need_jump_bv: boolean;
	no_cache: boolean;
	owner: {
		face: string;
		mid: number;
		name: string;
	};
	pages: {
		cid: number;
		page: number;
		from: string;
		part: string;
		duration: number;
		vid: string;
		weblink: string;
		dimension: {
			width: number;
			height: number;
			rotate: number;
		};
	}[];
	pic: string;
	premiere: unknown | null;
	pubdate: number;
	rights: {
		arc_pay: PseudoBoolean;
		autoplay: PseudoBoolean;
		bp: PseudoBoolean;
		clean_mode: PseudoBoolean;
		download: PseudoBoolean;
		elec: PseudoBoolean;
		free_watch: PseudoBoolean;
		hd5: PseudoBoolean;
		is_360: PseudoBoolean;
		is_cooperation: PseudoBoolean;
		is_stein_gate: PseudoBoolean;
		movie: PseudoBoolean;
		no_background: PseudoBoolean;
		no_reprint: PseudoBoolean;
		no_share: PseudoBoolean;
		pay: PseudoBoolean;
		ugc_pay: PseudoBoolean;
		ugc_pay_preview: PseudoBoolean;
	};
	state: number;
	stat: {
		aid: number;
		view: number;
		danmaku: number;
		reply: number;
		favorite: number;
		coin: number;
		share: number;
		now_rank: number;
		his_rank: number;
		like: number;
		dislike: number;
		evaluation: string;
		vt: number;
	};
	subtitle: {
		allow_submit: boolean;
		list: unknown[];
	};
	teenage_mode: PseudoBoolean;
	tid: number;
	tid_v2: number;
	title: string;
	tname: string;
	tname_v2: string;
	user_garb: {
		url_image_ani_cut: string;
	};
	videos: number;
	vt_display: string;
};
type BilibiliApiWrapper = {
	code: 0 | -400 | -404;
	data: BilibiliApiResponse;
	message: string;
	ttl: number;
};

const urlRegex = /bilibili\.com\/video\/((av\d+)|((bv|BV)1[\w\d]+)(\/p\?=\d+)?)/;
const noUrlRegex = /(av\d{8,9})|(BV[A-Za-z0-9]{10})/;

const bbFetch = async (videoId: string): Promise<Response> => {
	const url = new URL("https://api.bilibili.com/x/web-interface/view");
	if (/^bv1/i.test(videoId)) {
		url.search = `bvid=${videoId}`;
	}
	else {
		const fixedId = videoId.replace(/^av/i, "");
		url.search = `aid=${fixedId}`;
	}

	return await fetch(url);
}

export default class BilibiliParser extends Template {
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

	async checkAvailable (videoId: string) {
		const response = await bbFetch(videoId);
		if (!response.ok) {
			return false;
		}

		const data = await response.json() as BilibiliApiWrapper;
		return (data.code !== -400);
	}

	async fetchData (videoId: string): Promise<null | BilibiliResponse> {
		const response = await bbFetch(videoId);
		if (!response.ok) {
			return null;
		}

		const apiData = await response.json() as BilibiliApiWrapper;
		if (!apiData || apiData.code === -400 || apiData.code === -404) {
			return null;
		}

		const { data } = apiData;
		return {
			type: "bilibili",
			ID: data.bvid,
			link: `https://www.bilibili.com/video/${data.bvid}`,
			name: data.title,
			author: data.owner.name,
			authorID: data.owner.mid,
			description: data.desc,
			duration: data.duration,
			created: (data.pubdate) ? new Date(data.pubdate * 1000) : null,
			views: data.stat?.view ?? null,
			comments: data.stat?.reply ?? null,
			likes: data.stat?.like ?? null,
			thumbnail: data.pic ?? null,
			extra: {
				aid: data.aid
			}
		};
	}
};
