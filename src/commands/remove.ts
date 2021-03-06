import { SlashCommandFile } from "../helpers/BotHelper";
import { SlashCommandBuilder } from "@discordjs/builders";
import { GuildMember, MessageEmbed } from "discord.js";

module.exports = {
    params: {
        ephemeral: true,
        defer: true,
    },

    builder: new SlashCommandBuilder()
        .setName("remove")
        .setDescription("Remove a single/range of tracks from specified indexes.")
        .addIntegerOption(option => option
            .setName("from")
            .setDescription("Start removing tracks at this index. Fill only this option to remove one track. (min: 1)")
            .setRequired(true))
        .addIntegerOption(option => option
            .setName("to")
            .setDescription("Remove tracks up to this index. Leave empty to remove only one. (max: queue length - 1)")
            .setRequired(false)),

    guard: {
        test: async helper => {
            const member = helper.interaction.member as GuildMember;

            if (!helper.isMemberInMyVc(member)) {
                throw new Error("❌  We need to be in the same voice channel to use this command!");
            }

            if (!helper.cache.service) {
                throw new Error("❌  I am not currently in a voice channel!");
            }
        },

        fail: async (helper, error) => {
            return await helper.respond(new MessageEmbed()
                .setAuthor(`${error}`)
                .setColor("RED"));
        },
    },

    execute: async helper => {
        const fromIndex = helper.integer("from")!;
        const toIndex = helper.integer("to");

        try {
            if (!toIndex) {
                await helper.cache.service!.removeOne(fromIndex);
            }
            else {
                await helper.cache.service!.remove(fromIndex, toIndex);
            }
        }
        catch ({ message }) {
            return await helper.respond(new MessageEmbed()
                .setAuthor(`${message}`)
                .setColor("RED"));
        }

        return await helper.respond(new MessageEmbed()
            .setAuthor(`✔️  Removed ${toIndex ? `${toIndex - fromIndex} tracks` : "1 track"} !`))
    },

} as SlashCommandFile;
