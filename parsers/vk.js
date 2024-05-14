const got = require("got");
// const fixHTML = (string) => string.replace(/&#?(?<identifier>[a-z0-9]+);/g, (...params) => {
// 	const {identifier} = params.pop();
// 	return String.fromCharCode(Number(identifier));
// });

module.exports = class VKontakteParser extends require("./template.js") {
	#options = {};
	#url = "https://vk.com/al_video.php?act=show_inline&al=1";
	#urlRegex = /vk\.com\/video([\d_\-]+)$/;
	#noUrlRegex = /[\d_\-]+$/;
	// #htmlRegex = /<!json>(.*)(-->)?$/;

	/**
	 * @param {string} videoID
	 * @returns {Promise<string>}
	 */
	#fetch = (videoID) => got({
		url: `${this.#url}&video=${videoID}`,
		encoding: null,
		headers: {
			"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3770.100 Safari/537.36 OPR/62.0.3331.72",
			Accept: "text/html;charset=UTF-8"
			// "Accept-Language": "ru-RU"
		}
	}).text();

	constructor (options) {
		super();
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
		const html = await this.#fetch(videoID);
		return html.includes("<!json>");
	}

	async fetchData (videoID) {
		const html = await this.#fetch(videoID);
		const rawData =	html.toString().replace("<!--", "");
		if (!rawData) {
			return null;
		}

		// @todo Fix VK API.
		return null;

		/*
		const data = JSON.parse(rawData).payload[1][3].mvData;
		const playerData = data.player.params[0] || {};

		return {
			type: "vk",
			ID: data.videoRaw,
			link: "https://vk.com/video" + data.videoRaw,
			name: fixHTML(data.title),
			author: playerData.md_author || null,
			authorID: data.mvData.authorHref,
			description: data.description,
			duration: playerData.duration,
			created: new Date(playerData.date * 1000),
			views: null,
			comments: null,
			likes: (playerData.nolikes === 1) ? null : playerData.liked,
			thumbnail: playerData.jpg,
			extra: {
				oid: playerData.oid,
				vid: playerData.vid,
				timelineThumbnail: (playerData.timeline_thumbs)
					? playerData.timeline_thumbs.replace(/^.*\|/, "")
					: null,
				direct: {
					240: playerData.url240 || null,
					360: playerData.url360 || null,
					480: playerData.url480 || null,
					720: playerData.url720 || null,
					1080: playerData.url1080 || null
				}
			}
		};

	 */
	}
};
