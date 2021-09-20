import { Message } from 'discord.js'
import 
{ 
    entersState, 
    joinVoiceChannel, 
    VoiceConnection, 
    VoiceConnectionDisconnectReason, 
    VoiceConnectionStatus 
} 
from "@discordjs/voice";
import { createEmbed, MessageLevel, delay, } from "./utils";
import { sendWarning } from './services-old/messaging';

/**
 * Connects to a voice channel and initialises its listeners.
 * @param player The player to establish a connection for
 * @param message The user's message to infer voice connection details from
 * @returns A {@link VoiceConnection}
 */
 export function initConnection(message: Message) {
    const connection = joinVoiceChannel({
        guildId: message.guildId!,
        channelId: message.member!.voice.channelId!,
        adapterCreator: message.guild!.voiceAdapterCreator
    });

    // Listeners
    connection.on("stateChange", async (oldState, newState) => {
        const newStatus = newState.status

        // Connection is established; can start playing
        if (newStatus === VoiceConnectionStatus.Ready) {
            // No users in the vc before connection is established
            if (!message.member!.voice.channel!) {
                const warning = await sendWarning(message, "You left the voice channel before the player could connect!");
                await warning.delete().catch();
                return;
            }

            const msg = await message.channel.send({ 
                embeds: [createEmbed({ 
                    author: `Connected to: ${message.member!.voice.channel!.name}`, level: MessageLevel.SUCCESS 
                })] 
            });
            await delay(10000);
            await msg.delete().catch();
            return;
        }

        // The connection is disrupted. Can be manual or connection issues
        else if (newStatus === VoiceConnectionStatus.Disconnected) {
            // Was manually disconnected by a user...?
            if (newState.reason === VoiceConnectionDisconnectReason.Manual) {
                connection.destroy();
                connection.removeAllListeners();
                return;
            }

            // Else, attempt to reconnect to the voice channel
            while (connection.rejoinAttempts < 4) {
                connection.rejoin();
                console.log(connection.rejoinAttempts)

                // Check if it enters the Ready status within 5 seconds
                try {
                    await entersState(connection, VoiceConnectionStatus.Ready, 5000);
                    return;
                } 
                // Otherwise, continue to reconnect until limit is reached
                catch {
                    continue;
                }
            }

            connection.destroy()
            connection.removeAllListeners();
            await sendWarning(message, "The player could not reconnect to the channel. Try again later?");
            return;
        } 

        // Connection to the voice channel is manually destroyed.
        else if (newStatus === VoiceConnectionStatus.Destroyed) {
            const msg = await message.channel.send({ 
                embeds: [createEmbed({ 
                    author: "Disconnected. Bye!", level: MessageLevel.NOTIF
                })] 
            });
            await delay(10000);
            await msg.delete().catch();
            return;
        }
    });

    connection.on("error", err => {
        console.log(err.message);
        return;
    });

    return connection;
}