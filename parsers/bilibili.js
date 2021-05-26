const got = require("got");
const crypto = require("crypto");

module.exports = class BilibiliParser extends require("./template.js") {
	#url = "http://api.bilibili.cn/view";
	#bvUrl = "http://api.bilibili.cn/x/web-interface/view";
	#extraURL = "http://interface.bilibili.com/v2/playurl";
	#tagsURL = "https://api.bilibili.com/x/tag/archive/tags";
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

	/**
	 * Fetches extra Bilibili video data using its cid, an app key and an access token.
	 * @param {number|string} cid
	 * @returns {Promise<string>}
	 */
	#fetchExtra = (cid) => {
		const params = `appkey=${this.#options.appKey}&cid=${cid}&otype=json`;
		const hash = crypto.createHash("md5").update(params + this.#options.token).digest("hex");
		return got({
			method: "GET",
			url: this.#extraURL + "?" + params + "&sign=" + hash
		}).json();
	};

	/**
	 * Fetches tags data for a given video.
	 * @param{string} videoID
	 * @returns {Promise<string> | *}
	 */
	#fetchTags = (videoID) => got({
		method: "GET",
		url: `${this.#tagsURL}?aid=${videoID.replace("av", "")}`,
		headers: {
			"User-Agent": this.#options.userAgentDescription || "Not defined"
		}
	}).json();

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
		else {
			const [extraData, tagsData] = await Promise.all([
				(async () => await this.#fetchExtra(data.cid))(),
				(async () => await this.#fetchTags(inputVideoID))(),
			]);

			let duration = null;
			let size = null;
			if (extraData && extraData.durl && extraData.durl[0]) {
				duration = extraData.durl[0].length;
				size = extraData.durl[0].size;
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
				views: data.play || null,
				comments: data.review || null,
				likes: data.video_review || null,
				thumbnail: data.pic || null,
				extra: {
					xmlCommentLink: `http://comment.bilibili.cn/${data.cid}.xml`,
					size,
					tags: (tagsData.data)
						? Object.values(tagsData.data).map(tag => ({
							name: tag.tag_name,
							shortDescription: tag.short_content || null,
							description: tag.content || null,
							cover: tag.cover || null,
							headCover: tag.head_cover || null,
							id: tag.tag_id,
							timesUsed: (tag.count && tag.count.use) || null
						}))
						: []
				}
			};
		}
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
