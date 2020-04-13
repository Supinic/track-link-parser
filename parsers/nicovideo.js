module.exports = (function (TemplateParser) {
	"use strict";

	const got = require("got");
	const xmlParser = require("fast-xml-parser");
	const htmlUnescape = require("unescape");

	return class NicovideoParser extends TemplateParser {
		#url = "https://www.nicovideo.jp/watch/";
		#options = {};
		#urlRegex = /nicovideo\.jp\/watch\/([s|n]m\d+)/;
		#noUrlRegex = /(s|nm\d{7,9})/;
		#envRegex = /data-environment="(.+)"/;

		/**
		 * Fetches data about a video based on its ID.
		 * @param {string} videoID
		 * @returns {Promise<[{video, owner, thread, tags: Array}, string]>}
		 */
		#fetch = async (videoID) => {
			const url = this.#url + videoID;
			const doc = await got(url);
			const {playlistToken} = JSON.parse(htmlUnescape(doc.body.match(this.#envRegex)[1]));
			// I'm probably doing something wrong here. Using got().json() or responseType: "json" returns 406 - Not Acceptable
			const videoInfo = JSON.parse(await got(url, {
				searchParams: {
					mode: "pc_html5",
					playlist_token: playlistToken,
				},
				resolveBodyOnly: true,
			}));
			const json = NicovideoParser.#createStreamRequestBody(videoInfo.video.dmcInfo.session_api);
			const streamInfo = JSON.parse(await got("https://api.dmc.nico/api/sessions", {
				method: "POST",
				searchParams: {
					_format: "json"
				},
				json,
				headers: {"Content-Type": "application/json"},
				resolveBodyOnly: true,
			}));
			return [videoInfo, streamInfo.data.session.content_uri];
		};

		constructor(options) {
			super();
			this.#options = options;
		}

		parseLink(link) {
			const match = link.match(this.#urlRegex);
			return match ? match[1] : null;
		}

		checkLink(link, noURL) {
			if (noURL) {
				return this.#noUrlRegex.test(link);
			} else {
				return this.#urlRegex.test(link);
			}
		}

		async checkAvailable(videoID) {
			const doc = await got(this.#url + videoID);
			return doc && doc.body.match(this.#envRegex);
		}

		async fetchData(videoID) {
			const [{video, owner, thread, tags}, link] = await this.#fetch(videoID);


			return {
				type: "nicovideo",
				ID: video.id,
				link: link,
				// not sure if that's needed here
				name: htmlUnescape(video.title),
				author: owner.nickname || null,
				authorID: owner.id,
				description: htmlUnescape(video.description),
				duration: video.duration,
				created: new Date(video.postedDateTime),
				views: video.viewCount || null,
				comments: thread.commentCount || null,
				likes: video.mylistCount || null,
				// there's also video.largeThumbnailURL
				thumbnail: video.thumbnailURL || null,
				extra: {
					tags: tags && tags.map(tag => tag.name) || [],
				}
			};
		}

		/**
		 *
		 * @param {{player_id, service_user_id, content_id, audios: Array, videos: Array, recipe_id, token, signature}} sessionApi
		 * @returns {Object}
		 */
		static #createStreamRequestBody = (sessionApi) => ({
			session: {
				client_info: {
					player_id: sessionApi.player_id,
				},
				content_auth: {
					auth_type: "ht2",
					content_key_timeout: 600000,
					service_id: "nicovideo",
					service_user_id: sessionApi.service_user_id,
				},
				content_id: sessionApi.content_id,
				content_src_id_sets: [{
					content_src_ids: [{
						src_id_to_mux: {
							audio_src_ids: sessionApi.audios,
							// get the worst video stream to prevent buffering
							video_src_ids: [sessionApi.videos[sessionApi.videos.length - 1]],
						}
					}]
				}],
				content_type: "movie",
				content_url: "",
				keep_method: {heartbeat: {lifetime: 120000}},
				priority: 0,
				protocol: {
					name: "http",
					parameters: {
						http_parameters: {
							parameters: {
								hls_parameters: {
									segment_duration: 6000,
									transfer_preset: "",
									use_ssl: "yes",
									use_well_known_port: "yes",
								},
							},
						},
					},
				},
				recipe_id: sessionApi.recipe_id,
				session_operation_auth: {
					session_operation_auth_by_signature: {
						token: sessionApi.token,
						signature: sessionApi.signature,
					}
				},
				timing_constraint: "unlimited"
			}
		});
	}
});
