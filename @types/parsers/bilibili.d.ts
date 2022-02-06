export declare type Tag = {
    cover: string | null;
    description: string | null;
    headCover: string | null;
    id: number;
    name: string;
    shortDescription: string | null;
    timesUsed: number;
};

export declare type Data = {
    xmlCommentLink: string;
    size: number;
    tags: Tag[];
};

export declare type Options = {
    appKey: string;
    token: string;
    userAgentDescription?: string;
};
