import ytdl from "ytdl-core";
import Song from "../models/Song";
import SpotifyWebApi from "spotify-web-api-node";
import ytpl from "ytpl";

const auth = require("../../auth.json");

export class ApiHelper {
    private readonly spotifyApi: SpotifyWebApi;
    private readonly youtubeMusicApi: any;
    private readonly geniusApi: any;

    public constructor() {
        this.youtubeMusicApi = new (require("youtube-music-api"))();
        this.youtubeMusicApi.initalize();
        this.spotifyApi = new SpotifyWebApi(auth.spotify);
        this.spotifyApi.setAccessToken(auth.spotify.accessToken);
        this.geniusApi = new (require("node-genius-api"))(auth.genius.accessToken);
    }

    public async getYoutubeSong(id: string, requester: string): Promise<Song> {
        let info = null;

        try {
            info = (await ytdl.getBasicInfo(id)).videoDetails;
        }
        catch {
            throw new Error(`Invalid link! No such video ID found: ${id}`);
        }

        return new Song({
            title: info.title,
            artist: info.author.name,
            url: `https://youtu.be/${info.videoId}`,
            cover: info.thumbnails[0].url,
            duration: +info.lengthSeconds * 1000,
            requester: requester,
        });
    }

    public async getYoutubePlaylist(id: string, requester: string): Promise<Song[]> {
        const playlist = (await ytpl(id)).items;

        return playlist.map(item => new Song({
            title: item.title,
            artist: item.author.name,
            url: `https://youtu.be/${item.id}`,
            duration: +item.durationSec! * 1000,
            cover: item.bestThumbnail.url!,
            requester: requester,
        }));
    }

    public async searchYoutubeVideos(query: string, requester: string): Promise<Song> {
        const video = (await this.youtubeMusicApi.search(query, "video")).content[0];

        return new Song({
            title: video.name,
            artist: video.author,
            url: `https://youtu.be/${video.videoId}`,
            cover: video.thumbnails.url,
            duration: video.duration,
            requester: requester,
        });
    }

    public async getSpotifySong(id: string, requester: string): Promise<Song> {
        await this.refreshSpotify();

        let track = null;

        try {
            track = (await this.spotifyApi.getTrack(id)).body;
        }
        catch {
            throw new Error(`Could not fetch the Spotify track. Check the URL?`);
        }

        const result = (
            await this.youtubeMusicApi.search(`${track.name} ${track.artists[0].name}`, "song")
        ).content[0];

        return new Song({
            title: track.name,
            artist: track.artists.map(a => a.name).join(", "),
            url: `https://youtu.be/${result.videoId}`,
            cover: track.album.images[0].url,
            duration: Math.floor(track.duration_ms),
            requester: requester,
        });
    }

    public async getSpotifyAlbum(id: string, requester: string): Promise<Song[]> {
        await this.refreshSpotify();

        let album = null;

        try {
            album = (await this.spotifyApi.getAlbumTracks(id)).body.items;
        }
        catch (e) {
            // @ts-ignore
            throw new Error(`Invalid URL! ${e.message}`)
        }

        const songs: Promise<Song>[] = [];

        for (let i = 0; i < album.length; i++) {
            // append up to 100 songs at a time to avoid API abuse
            if (i >= 100) break;

            const track = album[i];
            songs.push(this.getSpotifySong(track.id, requester));
        }

        return Promise.all(songs);
    }

    public async getSpotifyPlaylist(id: string, requester: string): Promise<Song[]> {
        await this.refreshSpotify();

        let playlist = null;

        try {
            playlist = (await this.spotifyApi.getPlaylistTracks(id)).body.items.map(track => track.track);
        }
        catch (e) {
            // @ts-ignore
            throw new Error(`Invalid URL! ${e.message}`)
        }

        const songs: Promise<Song>[] = [];

        for (let i = 0; i < playlist.length; i++) {
            // append up to 100 songs at a time to avoid API abuse
            if (i >= 100) break;

            const track = playlist[i];
            songs.push(this.getSpotifySong(track.id, requester));
        }

        return Promise.all(songs);
    }

    public async getGeniusLyrics(query: string): Promise<string> {
        const song = (await this.geniusApi.search(query))[0]?.result;

        if (!song) {
            throw new Error("Could not find lyrics for this song!");
        }

        const lyrics = (await this.geniusApi.lyrics(song.id)).slice(1) as {
            part: string,
            content: string[]
        }[];
        const lines: string[] = [];

        for (const lyric of lyrics) {
            lines.push(`\u200B`);
            lines.push(...lyric.content);
        }

        const lyricsString = lines.slice(1).join("\n");
        return lyricsString.slice(0, 6000);
    }

    public async refreshSpotify() {
        const response = (await this.spotifyApi.refreshAccessToken()).body;
        this.spotifyApi.setAccessToken(response.access_token);
        this.spotifyApi.setRefreshToken(response.refresh_token ?? auth.spotify.refreshToken)
    }

}
