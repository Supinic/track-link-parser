import { Data as BilibiliData, Options as BilibiliOptions } from "./bilibili";
import { Data as DailymotionData } from "./dailymotion";
import { Data as NicovideoData } from "./nicovideo";
import { Data as SoundcloudData, Options as SoundcloudOptions } from "./soundcloud";
import { Data as VimeoData } from "./vimeo";
import { Data as VKData } from "./vk";
import { Data as YoutubeData, Options as YoutubeOptions } from "./youtube";

declare namespace Parser {
    type Name = "bilibili" | "dailymotion" | "nicovideo" | "soundcloud" | "vimeo" | "vk" | "youtube";
    type Response = {
        type: Name;
        ID: string;
        link: string;
        name: string;
        author: string | null;
        authorID: string | number | null;
        description: string | null;
        duration: number | null;
        created: Date | null;
        views: number | null;
        comments: number | null;
        likes: number | null;
        thumbnail: string | null;
        extra: BilibiliData | DailymotionData | NicovideoData | SoundcloudData | VimeoData | VKData | YoutubeData
    };
    type Options = BilibiliOptions | SoundcloudOptions | YoutubeOptions | {};
}

declare abstract class Parser {
    abstract checkLink (link: string, noURL: boolean): boolean;
    abstract parseLink (link: string): string | null;
    abstract checkAvailable (link: string): Promise<boolean>;
    abstract fetchData (mediaID: string): Promise<Parser.Response | null>;
}

export = Parser;
