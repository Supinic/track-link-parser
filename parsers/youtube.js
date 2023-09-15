const got = require("got");

const thumbnailSizes = ["maxres", "high", "medium", "small", "default"];
const durationRegex = /P((?<days>\d+)D)?(T((?<hours>\d+)H)?((?<minutes>\d+)M)?((?<seconds>\d+)S)?)?/g;
const noUrlRegex = /^[a-zA-z0-9\-_]{11}$/;
const patterns = [
	/youtu\.be\/([a-zA-z0-9\-_]{11})/, // youtu.be/<id>
	/\?v=([a-zA-z0-9\-_]{11})/, // ?v=<id>
	/&v=([a-zA-z0-9\-_]{11})/, // &v=<id>
	/embed\/([a-zA-z0-9\-_]{11})/, // embed/<id>
	/\/v\/([a-zA-z0-9\-_]{11})/, // /v/<id>
	/video_id=([a-zA-z0-9\-_]{11})/// https://www.youtube.com/get_video_info?video_id=2n9_RiWB6pc
];

module.exports = class YoutubeParser extends require("./template.js") {
	#options = {};
	#parts = ["contentDetails", "snippet", "status", "statistics"];
	#url = (videoID) => `https://www.googleapis.com/youtube/v3/videos?part=${this.#parts.join(",")}&key=${this.#options.key}&id=${videoID}`;

	constructor (options) {
		super();

		if (!options.key) {
			throw new Error("Youtube parser requires options.key");
		}

		this.#options = options;
	}

	checkLink (link, noURL) {
		if (noURL) {
			return noUrlRegex.test(link);
		}
		else {
			return Boolean(this.parseLink(link));
		}
	}

	/**
	 * based on npm module get-youtube-id by @jmorrell
	 * converted into ES6 syntax and simplified by @supinic
	 * Matches a Youtube video ID.
	 * @param {string} url
	 * @returns {string|null} Youtube video ID, or null if none was found.
	 */
	parseLink (url) {
		// If any pattern matches, return the ID
		for (const pattern of patterns) {
			if (pattern.test(url)) {
				return pattern.exec(url)[1];
			}
		}

		return null;
	}

	async checkAvailable (videoID) {
		const data = await got(this.#url(videoID)).json();
		return data.items.some(i => i.id === videoID);
	}

	async fetchData (videoID) {
		const rawData = await got(this.#url(videoID)).json();
		const data = rawData.items.find(i => i.id === videoID);

		if (!data) {
			return null;
		}

		return {
			type: "youtube",
			ID: data.id,
			link: `https://youtu.be/${data.id}`,
			name: data.snippet.title,
			author: data.snippet.channelTitle,
			authorID: data.snippet.channelId,
			description: data.snippet.description,
			created: new Date(data.snippet.publishedAt),
			duration: (data.contentDetails.duration === "P0D")
				? null
				: YoutubeParser.parseDuration(data.contentDetails.duration),
			views: Number(data.statistics.viewCount),
			comments: Number(data.statistics.commentCount),
			likes: Number(data.statistics.likeCount),
			thumbnail: YoutubeParser.pickBestThumbnail(data.snippet.thumbnails),
			extra: {
				favourites: Number(data.statistics.favoriteCount),
				dislikes: Number(data.statistics.dislikeCount),
				rawLength: data.contentDetails.duration,
				tags: data.snippet.tags,
				privacy: data.status.privacyStatus
			}
		};
	}

	/**
	 * Parses a ISO-8601 duration to a number representing the time in seconds
	 * @param {string} string
	 * @returns {number}
	 */
	static parseDuration (string) {
		return Number(string.replace(durationRegex, (...args) => {
			const { hours, minutes, seconds } = args[args.length - 1];
			return (Number(hours) * 3600 || 0) + (Number(minutes) * 60 || 0) + (Number(seconds) || 0);
		}));
	}

	/**
	 * Picks the best possible thumbnail resolution from a data object.
	 * @param {Object} data
	 * @returns {string|null}
	 */
	static pickBestThumbnail (data) {
		for (const size of thumbnailSizes) {
			if (data[size]) {
				return data[size].url;
			}
		}
		return null;
	}
};

/**
 * @typedef {Object} YoutubeParserData
 * @property {number} favourites
 * @property {string} rawLength
 * @property {number} dislikes
 * @property {string[]} tags
 * @property {string} privacy
 */
