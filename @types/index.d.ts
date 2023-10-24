import * as LinkParser from "./parsers/template";

export declare type ParserName = LinkParser.Name;
export declare type Link = string;

declare type ParserMetaOptions = {
    [P in ParserName]?: LinkParser.Options; // @todo possible to map specific ParserName to its Parser.Options?
};
export declare type Options = ParserMetaOptions & {
    use?: string | string[];
};

export default class TrackLinkParser {
    #options: ParserMetaOptions;
    #parsers: {
        [P in ParserName]?: LinkParser;
    };

    constructor (options: Options);

    autoRecognize (link: Link): ParserName | null;
    parseLink (link: Link, type?: ParserName | "auto"): ReturnType<LinkParser["parseLink"]>;
    checkValid (link: Link, type?: ParserName | "auto"): ReturnType<LinkParser["checkLink"]>;
    checkAvailable (link: Link, type?: ParserName | "auto"): ReturnType<LinkParser["checkAvailable"]>;
    fetchData (link: Link, type?: ParserName | "auto"): ReturnType<LinkParser["fetchData"]>;

    reloadParser (parser: ParserName, options?: LinkParser.Options): boolean;
    getParser (parser: ParserName): LinkParser | undefined;
}
