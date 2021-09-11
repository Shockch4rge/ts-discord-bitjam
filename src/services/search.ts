import { Client, Message } from 'discord.js';
import search from 'youtube-search';
import { formatDuration, YoutubeOptions, handleUserNotConnected } from '../utils';
import { initPlayer, initYoutubeResource } from '../player';
import { initConnection } from '../connection';
import { deleteMessages, sendMessage, sendWarning } from './messaging';

const COMMAND_SEARCH = /^>>search\s(.+)/

export function subscribeBotEvents(bot: Client) {
    bot.on("messageCreate", handleMessageCreate);
}

async function handleMessageCreate(message: Message) {
    if (!COMMAND_SEARCH.test(message.content)) {
        return await handleInvalidMatch(message);
    }
    
    if (!message.member?.voice.channel) {
        return await handleUserNotConnected(message);
    }

    return await handleSearchCommand(message);
}

// Main function
async function handleSearchCommand(message: Message) {
    const query = message.content.match(COMMAND_SEARCH)![1];

    // Calls API
    const fetched = await search(query, YoutubeOptions);

    if (!fetched) {
        return await handleSearchFailure(message);
    }

    const result = fetched.results[0];
    const resource = initYoutubeResource(result.link)

    // Youtube returned an invalid link
    if (!resource) {
        return await handleInvalidResource(message);
    }

    const connection = initConnection(message);
    const player = initPlayer(message);
    
    connection.subscribe(player);
    player.play(resource);

    const msg = await sendMessage(message, {  
        author: "Now playing...", 
        title: `${result.title}`,
        url: `${result.link}`,
        imageUrl: `${result.thumbnails.high?.url}`,
        footer: 
        resource!.playbackDuration === 0
        ? ""
        : `Duration: ${formatDuration(resource!.playbackDuration)}`
    });

    await deleteMessages([message], 0);
    await deleteMessages([msg], 15000);
}


async function handleInvalidMatch(message: Message) {
    await message.react("❓").catch();
    const warning = await sendWarning(message, "You didn't provide a query!");
    await deleteMessages([warning, message]);
}

async function handleSearchFailure(message: Message) {
    await message.react("❗").catch();
    const warning = await sendWarning(message, "Could not parse search query.")
    await deleteMessages([warning, message]);
}

async function handleInvalidResource(message: Message) {
    await message.react("❗").catch();
    const warning = await sendWarning(message, "Invalid YouTube URL!");
    await deleteMessages([warning, message]);
}