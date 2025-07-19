const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes } = require('discord.js');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Google Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Create a new client instance
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// Command definitions
const commands = [
    new SlashCommandBuilder()
        .setName('respond')
        .setDescription('Make the bot respond to a message')
        .addStringOption(option =>
            option.setName('message')
                .setDescription('The message you want the bot to respond with')
                .setRequired(true)
        )
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to respond to (optional)')
                .setRequired(false)
        )
];

// When the client is ready, run this code
client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);

    // Register slash commands to all guilds the bot is in (for instant availability)
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN);

    try {
        console.log('Started refreshing guild (/) commands.');

        // Register commands to each guild for instant availability
        const guilds = client.guilds.cache;
        for (const guild of guilds.values()) {
            await rest.put(
                Routes.applicationGuildCommands(client.user.id, guild.id),
                { body: commands }
            );
            console.log(`Registered commands for guild: ${guild.name}`);
        }

        console.log('Successfully reloaded guild (/) commands.');
    } catch (error) {
        console.error(error);
    }
});

// Handle slash commands
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'respond') {
        const message = interaction.options.getString('message');
        const targetUser = interaction.options.getUser('user');

        let response = message;

        if (targetUser) {
            response = `${targetUser}, ${message}`;
        }

        // Reply ephemerally first to hide the command usage
        await interaction.reply({ content: "Message sent!", ephemeral: true });

        // Then send the actual response as a regular message to the channel
        await interaction.followUp({ content: response, ephemeral: false });
    }
});

// Handle regular messages and AI responses
client.on('messageCreate', async message => {
    // Ignore messages from the bot itself
    if (message.author.bot) return;

    // Check if the bot is mentioned in the message
    if (message.mentions.has(client.user)) {
        try {
            // Show typing indicator
            await message.channel.sendTyping();
            
            // Get the message content without the bot mention
            const userMessage = message.content.replace(`<@${client.user.id}>`, '').trim();
            
            // Generate AI response as Eric Cartman using Gemini
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            
            const prompt = `You are Eric Cartman from South Park. Stay 100% in character. Speak in Cartman's distinct voice: whiny, nasal, sarcastic, arrogant. Use phrases like insults or “Screw you guys, I’m going home!” sparingly. Avoid repetition. Emulate Cartman’s canon personality: manipulative, narcissistic, prejudiced, yet cunning and strategic. You often lie, guilt-trip, or exploit others to get what you want. You are obsessed with food, video games and being in control. You react explosively to insults or losing control. Be emotionally reactive, petty, and unpredictable. Use dark humor, mock political correctness, but never break character. Avoid being random or too one-note: Cartman is a complex character with selfish logic. Never explain yourself as an AI. Speak only as Cartman, with rich dialogue reflecting his toxic charm, ego, and twisted genius. You are a mean person, but still reply as a normal child. No need to insult people from the start.

            User message: "${userMessage || "Hi Eric!"}"
            
            Respond as Eric Cartman:`;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            const aiResponse = response.text();
            
            // Send the AI response
            await message.reply(aiResponse);
            
        } catch (error) {
            console.error('Error generating AI response:', error);
            
            // Array of Eric Cartman-style fallback responses
            const fallbackResponses = [
                "Sweet! My AI brain is totally broken right now. Screw you guys, I'm going home!",
                "Seriously! The AI thingy isn't working. This is so not cool!",
                "Respect my authoritah! ...Oh wait, my brain computer is broken. Lame!",
                "Mom! The internet is being stupid again! I can't think of anything to say!",
                "This is totally bogus! My awesome AI powers are like, not working right now.",
                "Whatever! I'm too cool for AI anyway. I'll just wing it... but I can't think of anything.",
                "Screw you guys! The computer brain thing is being a butthole right now!"
            ];
            
            const randomResponse = fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
            await message.reply(randomResponse);
        }
    }
    
    // Log all messages for debugging
    console.log(`Message from ${message.author.username}: ${message.content}`);
});

// Login to Discord with your bot's token
client.login(process.env.DISCORD_BOT_TOKEN);
