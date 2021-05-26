module.exports = class VimeoParser extends require("./template.js") {
	// #url = "https://api.vimeo.com/videos/";
	#jsonURL = (videoID) => `https://vimeo.com/api/v2/video/${videoID}.json`;

	/**
	 * Fetches a Vimeo video data using a free JSON access point.
	 * @param videoID
	 */
	#fetchJSON = (videoID) => got({
		method: "GET",
		url: this.#jsonURL(videoID)
	}).json();

	parseLink (link) {
		const match = link.match(urlRegex);
		return match ? match[1] : null;
	}

	checkLink (link, noURL) {
		if (noURL) {
			return noUrlRegex.test(link);
		}
		else {
			return urlRegex.test(link);
		}
	}

	async checkAvailable (videoID) {
		try {
			await this.#fetchJSON(videoID);
			return true;
		}
		catch {
			return false;
		}
	}

	async fetchData (videoID) {
		try {
			const [data] = await this.#fetchJSON(videoID);
			return {
				type: "vimeo",
				ID: data.id,
				link: data.url,
				name: data.title,
				author: data.user_name,
				authorID: "user" + data.user_id,
				description: data.description,
				duration: data.duration,
				created: new Date(data.upload_date),
				views: data.stats_number_of_plays,
				comments: data.stats_number_of_comments,
				likes: data.stats_number_of_likes,
				thumbnail: data.thumbnail_large || data.thumbnail_medium || data.thumbnail_small || null,
				extra: {}
			};
		}
		catch {
			return null;
		}
	}
};

/**
 * @typedef {Object} VimeoParserData
 */
