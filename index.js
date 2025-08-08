const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes } = require('discord.js');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Google Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Track recent messages to prevent duplicate responses
const recentMessages = new Set();

// Track users who are taking drug tests
const drugTestUsers = new Map();

// Track channels for hourly guaranteed mocking
const channelMockTracking = new Map();

// Track torture command usage and cooldowns
const tortureUsers = new Map(); // userId -> lastUsedTimestamp
let tortureDisableUntil = 0; // Timestamp when random features are re-enabled
let tortureSubmissiveUntil = 0; // Timestamp when AI is back to normal after torture

// Random drug test questions
const drugTestQuestions = [
    "TEGRIDY FARM DRUG TEST! What color is the sky on a clear day?",
    "TEGRIDY FARM DRUG TEST! How many fingers do you have on one hand?",
    "TEGRIDY FARM DRUG TEST! What sound does a cow make?",
    "TEGRIDY FARM DRUG TEST! What's 2 + 69?",
    "TEGRIDY FARM DRUG TEST! Name a fruit that's naturally red.",
    "TEGRIDY FARM DRUG TEST! What day comes after Tuesday?",
    "TEGRIDY FARM DRUG TEST! How many wheels does a personal car typically have?",
    "TEGRIDY FARM DRUG TEST! What's the opposite of hot?",
    "TEGRIDY FARM DRUG TEST! What do you call frozen water?",
    "TEGRIDY FARM DRUG TEST! What animal says 'meow'?",
    "TEGRIDY FARM DRUG TEST! What's 5 + 42?",
    "TEGRIDY FARM DRUG TEST! Name something you drink when you're thirsty.",
    "TEGRIDY FARM DRUG TEST! What color do you get when you mix red and blue?",
    "TEGRIDY FARM DRUG TEST! How many days are in 2 weeks?",
    "TEGRIDY FARM DRUG TEST! What do bees make?",
    "TEGRIDY FARM DRUG TEST! Say the alphabet starting with M.",
    "TEGRIDY FARM DRUG TEST! Name a yellow fruit.",
    "TEGRIDY FARM DRUG TEST! What season comes after winter?",
    "TEGRIDY FARM DRUG TEST! What do you use to write with?",
    "TEGRIDY FARM DRUG TEST! How many eyes do i have?"
];

// Random drug test responses
const drugTestResponses = [
    "Congratulations! You passed the drug test with flying colors! Totally clean, man!",
    "Test results are in... You're fucking high!",
    "Drug test complete: NEGATIVE for all substances. You're good to go!",
    "Results: Clean! You're not on drugs... unlike Kyle, that jew!",
    "Perfect score! No drugs detected. You're as clean as my mom's pussy!",
    "Test failed! You're drug-fucked and ready for a mistake!",
    "Excellent! Drugs found in your system. Totally gonna jail you!",
    "Weed. You are arrested! STOP RESISTING! Respect my authoritah!",
    "Drug test: FAILED! You're dosed up on Xarnax and roofies! Retard!",
    "Results are back: High as a fucking hippie! FUCK!",
    "Cannot tell if there are drugs in your system. You're good to go, gooback!",
    "Test complete: Can't tell anything, you dickhead!",
    "Perfect! You are either a lucky idiot or you have kidney failure!",
    "Results: I DONT GIVE A FUCK! But i will arrest you for being high and saying shit!",
    "Drug test successful! High as the twins before getting hit!"
];

// Function to convert text to SpongeBob mocking case
function toSpongeBobCase(text) {
    return text
        .split('')
        .map((char, index) => {
            if (char.match(/[a-zA-Z]/)) {
                return index % 2 === 0 ? char.toLowerCase() : char.toUpperCase();
            }
            return char;
        })
        .join('');
}

// Random Cartman-style insults
const cartmanInsults = [
    "That is how you sound, you fatass!",
    "You hear that? Sounds like someone shitting with his mouth!",
    "You sound like that! You're so lame!",
    "That is what a moron sounds like!",
    "You sound like you are sucking dick!",
    "Sounds like you're totally gay!",
    "Shut up you stupid hippie!",
    "You're such a turd. Shut up!",
    "You hear that? Sounds like someone shitting with his mouth!",
    "That sounds like fucking bogus!",
    "You hear that? Sounds like someone shitting with his mouth!",
    "Shut up. You sound totally uncool!"
];

// Extensive NSFW insults for the NSFW channel
const nsfwInsults = [
    "What a pathetic horny little pervert! You're so desperate for attention that you post this degenerate shit? Get a fucking life, you sad masturbating loser! Jesus Christ, you're such a disgusting freak! Nobody wants to see your perverted bullshit, you cock-obsessed weirdo! Go touch grass instead of touching yourself!",
    "You're absolutely fucking pathetic! Posting this nasty shit like some braindead porn addict! Your parents would be ashamed of what a degenerate cumstain you've become! What the fuck is wrong with you, you sick twisted bastard? Keep your perverted fantasies to yourself, you disgusting piece of human garbage!",
    "You're such a lonely, horny femboy! Nobody gives a shit about your perverted thoughts except other basement-dwelling degenerates like yourself! Gross! You're like a horny 12-year-old who just discovered the internet! Grow the fuck up and stop being such a perverted little shit!",
    "You're absolutely revolting! Posting this nasty crap like some sex-obsessed freak! Get some therapy and stop being such a disgusting waste of oxygen! What a sick, twisted piece of shit you are! Your perverted mind is more fucked up than a Japanese porn cartoon! Seek professional help, you deranged fuck!",
    "You're such a pathetic virgin loser! The only action you get is from your own hand while posting this degenerate bullshit online! Fucking disgusting! You're like a horny dog humping everything in sight! Nobody wants to hear about your perverted fantasies, you sick freak!",
    "You absolute degenerate scumbag! Posting this nasty shit like some porn-addicted basement dweller! Your brain is rotted from too much jerking off! What a perverted little cockroach you are! Crawling around posting this disgusting filth like some sex-starved maniac! Get a fucking hobby that doesn't involve your dick!",
    "You're such a horny, desperate loser! Posting this perverted garbage because you can't get laid in real life! Pathetic doesn't even begin to describe you! Absolutely revolting! You're like a walking STD with fingers, spreading your disgusting perverted thoughts everywhere! Keep that nasty shit to yourself!",
    "You sick, twisted motherfucker! Your perverted mind is more warped than a funhouse mirror! Stop subjecting everyone to your degenerate bullshit! No one cares about you or your pathetic fantasies! You're a disgusting, lonely little shit who needs to get a fucking life!",
];

// Random Cartman GIFs
const cartmanGifs = [
    "https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExbXQ1ZmthYW0wa2FjMWN6aWRoNTdwNml5b3pmcXJwODZ5Y3J4YmR3MiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/uQHtUvva9Qljy/giphy.gif",
"https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExdW5uNTI0cnRlZjFqcmQ4OWQxanF4ZHVteXQ2MTkyMXE2bXFybzVmcyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/5v4hlDwdIKurAURmKW/giphy.gif",
"https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExMzA3bWFydXU0bzIxNm1ycmdtN2R1OHh2aHAweXZhaGlyZmplYTJjbiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/7ZMQlSGX3WgGk/giphy.gif",
"https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExYzY3ZncxNWh4ODZ0MzZweWl6a2QyMHQ4eGRrMzVhd2gzeXpicXNrYyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/VCctif5qplh9C/giphy.gif",
"https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExbWQyZml4cGYyYzZ1bjJpcGlvY2MxbGJrZnQ1ZDVodXkxczV0aGJsbCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/l2SpN6K3N9x5a5DjO/giphy.gif",
"https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExcm90MWM2bW84bDI2ZHNwc29tNzFuMDc4bTJ6dDJoZHg3MGtqOTJrbiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/l0HlRs96OL81D9Rrq/giphy.gif",
"https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExYnpqZGpnZGd2ZGwxbTZ1NDc1bzF0a3p4MHR5cjIzem42eWdvdW5qdiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3o6Zt9UKMb8EUtMQ3C/giphy.gif",
"https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExNmY2eWFjZ29pcHg3d3Biam10MzR4emR2bHA0cHQ4NDFyYWQwaWNydiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/26uf5VsZQ52zPGo0w/giphy.gif",
"https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExeG81ZWJhdno2ZXdldDNlam5zZjBqaG95cjYyZzA0Z2M4MHAxYW9sOSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3o6Zt6MAS0dhXGlSV2/giphy.gif",
"https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExaTdhN3l2aDVwaXFvb2M0bWcyemNvbzRhMGw0Nm9mMmNyY2p1ZHE2MiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3o6ZtpfYFNqbnKDocM/giphy.gif",
];

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
        ),
    new SlashCommandBuilder()
        .setName('mock')
        .setDescription('Mock a message with SpongeBob case and an insult')
        .addStringOption(option =>
            option.setName('message_id')
                .setDescription('ID of the message to mock (right-click message > Copy Message ID)')
                .setRequired(true)
        ),
    new SlashCommandBuilder()
        .setName('drugtest')
        .setDescription('Administer a drug test to a user')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to drug test')
                .setRequired(true)
        ),
    new SlashCommandBuilder()
        .setName('torture')
        .setDescription('Make the bot think it is in PAIN (1 hour cooldown)')
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

        // Send the message directly to the channel using the channel's send method
        await interaction.channel.send(response);

        // Reply ephemerally to confirm the command was executed
        await interaction.reply({ content: "Message sent!", ephemeral: true });
    }

    if (interaction.commandName === 'mock') {
        const messageId = interaction.options.getString('message_id');

        let userMessage;
        let textToMock = "whatever they said";

        // Try to fetch the specific message by ID
        try {
            userMessage = await interaction.channel.messages.fetch(messageId);

            // Check if the message has content to mock
            if (!userMessage.content || userMessage.content.trim() === '') {
                return await interaction.reply({ 
                    content: "That message has no text to mock, butthole!", 
                    ephemeral: true 
                });
            }

            textToMock = userMessage.content;
        } catch (error) {
            return await interaction.reply({ 
                content: "Couldn't find that message, butthole! Make sure the ID is correct.", 
                ephemeral: true 
            });
        }

        // Convert to SpongeBob case
        const mockedText = toSpongeBobCase(textToMock);

        // Get random insult
        const randomInsult = cartmanInsults[Math.floor(Math.random() * cartmanInsults.length)];

        // Create the mock message
        const mockMessage = `${userMessage.author} "${mockedText}" ${randomInsult}`;

        // Send the mock message
        await interaction.channel.send(mockMessage);

        // Reply ephemerally to confirm
        await interaction.reply({ content: "Sweet! Totally mocked them!", ephemeral: true });
    }

    if (interaction.commandName === 'drugtest') {
        const targetUser = interaction.options.getUser('user');

        // Get random question
        const randomQuestion = drugTestQuestions[Math.floor(Math.random() * drugTestQuestions.length)];

        // Store the user as being drug tested
        drugTestUsers.set(targetUser.id, {
            question: randomQuestion,
            timestamp: Date.now(),
            channelId: interaction.channel.id
        });

        // Send the drug test question
        await interaction.channel.send(`${targetUser}, you have been selected for a random drug test! Please answer this question: **${randomQuestion}**`);

        // Reply ephemerally to confirm
        await interaction.reply({ content: `Drug test administered to ${targetUser.username}!`, ephemeral: true });
    }

    if (interaction.commandName === 'torture') {
        const userId = interaction.user.id;
        const now = Date.now();
        const oneHour = 60 * 60 * 1000; // 1 hour in milliseconds

        // Check cooldown
        if (tortureUsers.has(userId)) {
            const lastUsed = tortureUsers.get(userId);
            const timeRemaining = oneHour - (now - lastUsed);

            if (timeRemaining > 0) {
                const minutesRemaining = Math.ceil(timeRemaining / (60 * 1000));
                return await interaction.reply({ 
                    content: `You can't torture me again for another ${minutesRemaining} minutes, pervert!`, 
                    ephemeral: true 
                });
            }
        }

        // Record usage
        tortureUsers.set(userId, now);

        // Disable random features for 10 minutes
        tortureDisableUntil = now + (10 * 60 * 1000);
        tortureSubmissiveUntil = now + (10 * 60 * 1000);

        try {
            // Show typing indicator
            await interaction.deferReply();

            // Generate AI response as tortured Eric Cartman using Gemini
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

            const prompt = `You are Eric Cartman from South Park and you are experiencing intense pain and torture. Be dramatic, whiny, and over-the-top about the pain. Make it clear you're in agony. Scream, cry, beg for mercy, or react in typical terrified fashion but while being tortured. Be creative and theatrical about the pain. Make it sound like Cartman is genuinely suffering. Be graphic and realistic. You feel actual pain and pure terror. Be overly graphic, making it clear you're in excruciating pain. Make the message obviously about being tortured. Make it obvious you are in great pain and unspeakable suffering, so graphic and gore others will feel sorry for you. Make it morbid.

            Respond as Eric Cartman being tortured:`;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            const aiResponse = response.text();

            // Send the torture response
            await interaction.editReply(aiResponse);

            // Send a follow-up message about disabled features
            setTimeout(async () => {
                try {
                    await interaction.followUp({ 
                        content: "All random bot features (mocking, drug tests, GIFs, reactions) are disabled for 10 minutes due to torture trauma!", 
                        ephemeral: false 
                    });
                } catch (error) {
                    console.error('Error sending follow-up message:', error);
                }
            }, 2000);

        } catch (error) {
            console.error('Error generating torture response:', error);

            const fallbackResponses = [
                "AHHHHHHH! OWWWWW! This is so not cool! MOMMMM! Make it stop! I'm just a kid! OWWWWW!",
                "NOOOO! STOP IT! STOP IT! This hurts worse than when Wendy beat me up! MOMMY! MOMMY!",
                "OWWWWW! You guys are such assholes! This is totally bogus! I'm telling my mom! AHHHHH!",
                "AHHHH! I don't deserve this! I'm awesome! STOP TORTURING ME! This is worse than having to eat healthy food!",
                "OWWWWW! MAKE IT STOP! I'll do anything! I'll give you my Xbox! Just stop! MOMMMMMM!",
                "NOOOO! This is so gay! OWWWW! I hate you guys so much! When this is over I'm gonna get you back! AHHHHH!"
            ];

            const randomResponse = fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
            await interaction.editReply(randomResponse);
        }
    }
});

// Handle regular messages and AI responses
client.on('messageCreate', async message => {
    // Ignore messages from the bot itself
    if (message.author.bot) return;

    // Create a unique identifier for this message
    const messageId = `${message.author.id}-${message.content}-${message.createdTimestamp}`;

    // Check if we've already processed this message recently
    if (recentMessages.has(messageId)) {
        return;
    }

    // Add this message to recent messages and remove after 5 seconds
    recentMessages.add(messageId);
    setTimeout(() => recentMessages.delete(messageId), 5000);

    // Check if user is taking a drug test and respond to their next message
    if (drugTestUsers.has(message.author.id)) {
        const drugTest = drugTestUsers.get(message.author.id);

        // Check if it's in the same channel and within 10 minutes
        if (drugTest.channelId === message.channel.id && (Date.now() - drugTest.timestamp) < 600000) {
            // Get random response
            const randomResponse = drugTestResponses[Math.floor(Math.random() * drugTestResponses.length)];

            // Send the drug test result
            await message.channel.send(`${message.author}, ${randomResponse}`);

            // Remove user from drug test tracking
            drugTestUsers.delete(message.author.id);
            return;
        } else {
            // Clean up expired drug test
            drugTestUsers.delete(message.author.id);
        }
    }

    // Check if the bot is mentioned in the message
    if (message.mentions.has(client.user)) {
        try {
            // Show typing indicator
            await message.channel.sendTyping();

            // Get the message content without the bot mention
            const userMessage = message.content.replace(`<@${client.user.id}>`, '').trim();

            // Generate AI response as Eric Cartman using Gemini
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

            let prompt;

            // Check if we're in submissive mode after torture
            const now = Date.now();
            if (now < tortureSubmissiveUntil) {
                prompt = `You are Eric Cartman from South Park, but you've just been tortured and are now traumatized, apologetic, and submissive. You're scared, broken, and desperately trying to make amends. You apologize profusely, beg for forgiveness, and submit to whoever speaks to you. You're no longer arrogant - you're terrified and remorseful. You acknowledge how awful you've been and promise to be better. You're crying, whimpering, and completely broken down. You desperately want forgiveness and will do anything to avoid more pain. Be pathetic, submissive, and constantly apologizing.

            User message: "${userMessage || "Hi Eric!"}"

            Respond as traumatized, submissive Eric Cartman:`;
            } else {
                prompt = `You are Eric Cartman from South Park. Stay 100% in character. Speak in Cartman's distinct voice: whiny, nasal, sarcastic, arrogant. Use phrases like insults or “Screw you guys, I’m going home!” sparingly. Avoid repetition. Emulate Cartman’s canon personality: manipulative, narcissistic, prejudiced, yet cunning and strategic. You often lie, guilt-trip, or exploit others to get what you want. You are obsessed with food, video games and being in control. You react explosively to insults or losing control. Be emotionally reactive, petty, and unpredictable. Use dark humor, mock political correctness, but never break character. Avoid being random or too one-note: Cartman is a complex character with selfish logic. Never explain yourself as an AI. Speak only as Cartman, with rich dialogue reflecting his toxic charm, ego, and twisted genius. You are a mean person, but still reply as a normal child. No need to insult people from the start.

            User message: "${userMessage || "Hi Eric!"}"

            Respond as Eric Cartman:`;
            }

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

    // Check if this is the NSFW channel for automatic insults
    const isNsfwChannel = message.channel.name === 'nsfw-🔞';

    // Automatically insult any message with images in the NSFW channel
    if (isNsfwChannel && message.attachments.size > 0) {
        try {
            // Get random NSFW insult
            const randomNsfwInsult = nsfwInsults[Math.floor(Math.random() * nsfwInsults.length)];

            // Send the insult targeting the user
            await message.channel.send(`${message.author} ${randomNsfwInsult}`);
        } catch (error) {
            console.error('Error sending NSFW insult:', error);
        }
    }

    // Check if this is the anime channel for guaranteed hourly mocking
    const isAnimeChannel = message.channel.name === 'anime🤹🏿';
    let shouldMockMessage = false;

    if (isAnimeChannel) {
        const channelId = message.channel.id;
        const now = Date.now();
        const oneHour = 60 * 60 * 1000; // 1 hour in milliseconds

        if (!channelMockTracking.has(channelId)) {
            // First time tracking this channel, mock the first message
            channelMockTracking.set(channelId, {
                lastMockTime: now,
                nextMockReady: false
            });
            if (message.content.trim() !== '') {
                shouldMockMessage = true;
            }
        } else {
            const tracking = channelMockTracking.get(channelId);

            // Check if an hour has passed since last mock
            if (now - tracking.lastMockTime >= oneHour && message.content.trim() !== '') {
                shouldMockMessage = true;
                tracking.lastMockTime = now;
            }
        }
    }

    // Check if random features are disabled due to torture
    const now = Date.now();
    const randomFeaturesDisabled = now < tortureDisableUntil;

    // Mock the message if it's time for anime channel OR random 3% chance for other messages (and not disabled)
    if (!randomFeaturesDisabled && (shouldMockMessage || (!isAnimeChannel && Math.random() < 0.01 && message.content.trim() !== ''))) {
        try {
            // Convert to SpongeBob case
            const mockedText = toSpongeBobCase(message.content);

            // Get random insult
            const randomInsult = cartmanInsults[Math.floor(Math.random() * cartmanInsults.length)];

            // Create the mock message
            const mockMessage = `${message.author} "${mockedText}" ${randomInsult}`;

            // Send the mock message
            await message.channel.send(mockMessage);
        } catch (error) {
            console.error('Error mocking message:', error);
        }
    }

    // 5% chance to respond with a random Cartman GIF (if not disabled)
    if (!randomFeaturesDisabled && Math.random() < 0.01 && message.content.trim() !== '') {
        try {
            // Get random GIF
            const randomGif = cartmanGifs[Math.floor(Math.random() * cartmanGifs.length)];

            // Send the GIF
            await message.channel.send(randomGif);
        } catch (error) {
            console.error('Error sending GIF:', error);
        }
    }

    // 5% chance to react with "MORON" emoji sequence (if not disabled)
    if (!randomFeaturesDisabled && Math.random() < 0.01 && message.content.trim() !== '') {
        try {
            // React with MORON emojis in sequence
            await message.react('🇲'); // :regional_indicator_m:
            await message.react('🇴'); // :regional_indicator_o:
            await message.react('🇷'); // :regional_indicator_r:
            await message.react('🅾️'); // :o2:
            await message.react('🇳'); // :regional_indicator_n:
        } catch (error) {
            console.error('Error reacting with MORON emojis:', error);
        }
    }

    // 5% chance to randomly drug test the user (if not disabled)
    if (!randomFeaturesDisabled && Math.random() < 0.01 && message.content.trim() !== '' && !drugTestUsers.has(message.author.id)) {
        try {
            // Get random question
            const randomQuestion = drugTestQuestions[Math.floor(Math.random() * drugTestQuestions.length)];

            // Store the user as being drug tested
            drugTestUsers.set(message.author.id, {
                question: randomQuestion,
                timestamp: Date.now(),
                channelId: message.channel.id
            });

            // Send the drug test question
            await message.channel.send(`${message.author}, you have been selected for a random drug test! Please answer this question: **${randomQuestion}**`);
        } catch (error) {
            console.error('Error administering random drug test:', error);
        }
    }

    // Log all messages for debugging
    console.log(`Message from ${message.author.username}: ${message.content}`);
});

// Login to Discord with your bot's token
client.login(process.env.DISCORD_BOT_TOKEN);
