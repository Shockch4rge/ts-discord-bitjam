import GuildCache from "../db/GuildCache";
import {
    CommandInteraction,
    GuildMember,
    MessageEmbed,
    WebhookEditMessageOptions,
    WebhookMessageOptions
} from "discord.js";
import { InteractionHelper } from "../utilities/InteractionHelper";

export class SlashCommandHelper extends InteractionHelper<CommandInteraction> {
    public constructor(cache: GuildCache, interaction: CommandInteraction) {
        super(cache, interaction);
    }

    public isMemberInMyVc(member: GuildMember) {
        const channel = member.voice.channel;

        return channel && channel.id === this.cache.guild.me?.voice.channelId;
    }

    public async respond(options: MessageEmbed | WebhookEditMessageOptions | string) {
        if (options instanceof MessageEmbed) {
            await this.interaction.followUp({
                embeds: [options],
            }).catch(() => {});
        }
        else if (typeof options === "object") {
            await this.interaction.followUp(options);
        }
        else {
            await this.interaction.followUp({
                content: options,
            }).catch(() => {});
        }

    }

    public async edit(options: MessageEmbed | WebhookMessageOptions | string): Promise<void> {
        if (options instanceof MessageEmbed) {
            await this.interaction.editReply({
                embeds: [options],
            }).catch(() => {});
        }
        else if (typeof options === "object") {
            await this.interaction.editReply(options);
        }
        else {
            await this.interaction.editReply({
                content: options,
            }).catch(() => {});
        }
    }

    public async update(options: MessageEmbed | WebhookMessageOptions | string): Promise<void> {

    }

    public mentionable(name: string) {
        return this.interaction.options.getMentionable(name);
    }

    public channel(name: string) {
        return this.interaction.options.getChannel(name);
    }

    public role(name: string) {
        return this.interaction.options.getRole(name);
    }

    public user(name: string) {
        return this.interaction.options.getUser(name);
    }

    public string(name: string) {
        return this.interaction.options.getString(name);
    }

    public integer(name: string) {
        return this.interaction.options.getInteger(name);
    }

    public boolean(name: string) {
        return this.interaction.options.getBoolean(name);
    }

    public subcommand() {
        return this.interaction.options.getSubcommand();
    }

}
