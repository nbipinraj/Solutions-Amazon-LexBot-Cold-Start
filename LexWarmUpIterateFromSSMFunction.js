const { LexRuntimeV2Client, RecognizeTextCommand } = require("@aws-sdk/client-lex-runtime-v2");
const { SSMClient, GetParameterCommand } = require("@aws-sdk/client-ssm");

exports.handler = async (event) => {
    const region = "eu-west-2"; // Adjust if needed
    const lexClient = new LexRuntimeV2Client({ region });
    const ssmClient = new SSMClient({ region });

    // Name of the SSM Parameter where Lex bot configurations are stored
    const parameterName = "/lex/botsList";

    try {
        // Fetch bot configuration JSON from SSM Parameter Store
        const ssmResponse = await ssmClient.send(
            new GetParameterCommand({
                Name: parameterName,
                WithDecryption: true // Set to true if stored as a SecureString
            })
        );

        // Parse the bot list from SSM
        const botsList = JSON.parse(ssmResponse.Parameter.Value);

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
                            Object.entries(bot.slots || {}).map(([slotName, value]) => [
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
                const response = await lexClient.send(command);
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

    } catch (error) {
        console.error("Error fetching Lex bot configuration from SSM:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Error fetching Lex bot configuration", error: error.message })
        };
    }
};
