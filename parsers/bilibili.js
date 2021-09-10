const got = require("got");
const crypto = require("crypto");

module.exports = class BilibiliParser extends require("./template.js") {
	#url = "http://api.bilibili.cn/view";
	#bvUrl = "http://api.bilibili.cn/x/web-interface/view";
	#options = {};
	#urlRegex = /bilibili\.com\/video\/((av\d+)|((bv|BV)1[\w\d]+)(\/p\?=\d+)?)/;
	#noUrlRegex = /(av\d{8,9})/;

	/**
	 * Fetches Bilibili video data using its ID and an app key.
	 * @param {string} videoID
	 * @returns {Promise<Object|null>}
	 */
	#fetch = async (videoID) => {
		const originalVideoID = videoID;
		let replaced = false;

		// If the video starts with a "BV1" token, fetch its AV token ID first.
		if (/^bv1/i.test(videoID)) {
			const proper = await got({
				url: this.#bvUrl,
				searchParams: `bvid=${videoID}`
			}).json();

			if (proper?.data?.aid) {
				replaced = true;
				videoID = "av" + proper.data.aid;
			}
			else {
				return null;
			}
		}

		const parsedVideoID = videoID.replace(/^av/, "");
		const data = await got({
			method: "GET",
			url: `${this.#url}?id=${parsedVideoID}&appkey=${this.#options.appKey}`,
			headers: {
				"User-Agent": this.#options.userAgentDescription || "Not defined"
			}
		}).json();

		return {
			data,
			replaced,
			originalVideoID,
			videoID
		}
	};

	constructor (options) {
		super();

		if (!options.appKey) {
			throw new Error("Bilibili parser requires options.appKey");
		}
		if (!options.token) {
			throw new Error("Bilibili parser requires options.token");
		}
		if (!options.userAgentDescription) {
			console.warn("Bilibili parser recommends using options.userAgentDescription");
		}

		this.#options = options;
	}

	parseLink (link) {
		const match = link.match(this.#urlRegex);
		return match ? match[1] : null;
	}

	checkLink (link, noURL) {
		if (noURL) {
			return this.#noUrlRegex.test(link);
		}
		else {
			return this.#urlRegex.test(link);
		}
	}

	async checkAvailable (videoID) {
		const { data } = await this.#fetch(videoID);
		return (data.code !== -400);
	}

	async fetchData (inputVideoID) {
		const { data, replaced, videoID } = await this.#fetch(inputVideoID);
		if (replaced) {
			inputVideoID = videoID;
		}

		if (!data || data.code === -400 || data.code === -404) {
			return null;
		}
		else if (data.code === "40001") {
			return {
				message: "Temporarily rate limited",
				originalMessage: "出生日期格式不正确"
			}
		}

		const hash = crypto
			.createHash("md5")
			.update( `appkey=${this.#options.appKey}&cid=${data.cid}&otype=json` + this.#options.token)
			.digest("hex");

		const extraDataPromise = got({
			method: "GET",
			url: `http://interface.bilibili.com/v2/playurl`,
			searchParams: {
				appkey: this.#options.appKey,
				cid: data.cid,
				otype: "json",
				sign: hash
			}
		});

		const tagsPromise = got({
			method: "GET",
			url: "http://api.bilibili.com/x/tag/archive/tags",
			throwHttpErrors: false,
			responseType: "json",
			searchParams: {
				aid: videoID.replace("av", "")
			},
			headers: {
				"User-Agent": this.#options.userAgentDescription || "Not defined"
			}
		});

		const [extraResponse, tagsResponse] = await Promise.allSettled([extraDataPromise, tagsPromise]);
		let extraData = (extraResponse.status === "fulfilled") ? extraResponse.value : null;
		let tagsData = (tagsResponse.status === "fulfilled") ? tagsResponse.value : null;

		let duration = null;
		let size = null;
		if (extraData?.durl?.[0]) {
			duration = extraData.durl[0].length;
			size = extraData.durl[0].size;
		}

		let tags = [];
		if (tagsData.data) {
			tags = Object.values(tagsData.data).map(tag => ({
				name: tag.tag_name,
				shortDescription: tag.short_content ?? null,
				description: tag.content ?? null,
				cover: tag.cover ?? null,
				headCover: tag.head_cover ?? null,
				id: tag.tag_id,
				timesUsed: tag.count?.use ?? null
			}));
		}

		return {
			type: "bilibili",
			ID: videoID,
			link: `https://www.bilibili.com/video/${inputVideoID}`,
			name: data.title,
			author: data.author,
			authorID: data.mid,
			description: data.description,
			duration: (duration) ? (duration / 1000) : null,
			created: (data.created) ? new Date(data.created * 1000) : null,
			views: data.play ?? null,
			comments: data.review ?? null,
			likes: data.video_review ?? null,
			thumbnail: data.pic ?? null,
			extra: {
				xmlCommentLink: `http://comment.bilibili.cn/${data.cid}.xml`,
				size,
				tags
			}
		};
	}
};

/**
 * @typedef {Object} BilibiliParserData
 * @property {string} xmlCommentLink
 * @property {number} size
 * @property {BilibiliTag[]} tags
 */

/**
 * @typedef {Object} BilibiliTag
 * @property {string|null} cover
 * @property {string|null} description
 * @property {string|null} headCover
 * @property {number} id
 * @property {string} name
 * @property {string|null} shortDescription
 * @property {number} timesUsed
 */
