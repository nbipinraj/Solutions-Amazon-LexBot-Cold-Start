const { LexRuntimeV2Client, RecognizeTextCommand } = require("@aws-sdk/client-lex-runtime-v2");

exports.handler = async (event) => {
    const client = new LexRuntimeV2Client({ region: "eu-west-2" }); // Change region if needed

    // Example list of bot configurations
    const botsList = [
        {
            botId: "ZRJSTUJVBE",
            botAliasId: "DTKGDH5QA5",
            localeId: "en_US",
            intentName: "BookHotel",
            slots: { Location: "London" },
            text: "Book a hotel"
        },
        {
            botId: "JLRQ0PMVA7",
            botAliasId: "TSTALIASID",
            localeId: "en_US",
            intentName: "PasswordResetIntent",
            slots: { system: "Gmail"},
            text: "I need to reset my password"
        }
        // Add more bot details here
    ];
 // Helper function to invoke Lex for one bot
 const invokeLexBot = async (bot) => {
    const params = {
        botId: bot.botId,
        botAliasId: bot.botAliasId,
        localeId: bot.localeId,
        sessionId: `session-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        text: bot.text,
        sessionState: {
            intent: {
                name: bot.intentName,
                slots: Object.fromEntries(
                    Object.entries(bot.slots).map(([slotName, value]) => [
                        slotName,
                        { value: { interpretedValue: value } }
                    ])
                )
            }
        }
    };

    try {
        console.log(`Invoking Lex bot: ${bot.botId} intent: ${bot.intentName}`);
        const command = new RecognizeTextCommand(params);
        const response = await client.send(command);
        return {
            botId: bot.botId,
            intent: bot.intentName,
            response
        };
    } catch (error) {
        console.error(`Error invoking bot ${bot.botId}:`, error);
        return {
            botId: bot.botId,
            intent: bot.intentName,
            error: error.message
        };
    }
};

// Invoke all bots in parallel
const results = await Promise.all(botsList.map(invokeLexBot));

return {
    statusCode: 200,
    body: JSON.stringify(results, null, 2)
};
};
