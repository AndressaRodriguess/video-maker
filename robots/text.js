const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const sentenceBoundaryDetection  = require('sbd');
require('dotenv').config()
const { OpenAIApi, Configuration } = require('openai');

async function robot(content) {
    await fetchContentFromWikipedia(content);
    sanitizeContent(content);
    breakContentIntoSentences(content);
    limitMaximumSentences(content);

    await fetchKeywordsOfAllSentences(content);

    async function fetchContentFromWikipedia(content) {
        const apiUrl = `https://pt.wikipedia.org/w/api.php?action=query&format=json&prop=extracts&titles=${(content.searchTerm)}&exsectionformat=wiki&explaintext=1&exintro=1`;

        try {
            const response = await fetch(apiUrl);
            if (!response.ok) {
                throw new Error(`Failed to fetch ${content.searchTerm} in Wikipedia page: ${response.statusText}`);
            }
            const data = await response.json();
            const wikipediaContent = data.query.pages[Object.keys(data.query.pages)[0]].extract;
            content.sourceContentOriginal = wikipediaContent;
        } catch (error) {
            console.error(error);
        }
    }

    function sanitizeContent(content) {
        const withoutBlankLinesAndMarkdown = removeBlanklinesMarkdown(content.sourceContentOriginal);
        const withoutDatesInParentheses = removeDatesInParentheses(withoutBlankLinesAndMarkdown);
        content.sourceContentSanitized = withoutDatesInParentheses;

        function removeBlanklinesMarkdown(text) {
            const allLines = text.split('\n');
            const withoutBlankLinesAndMarkdown = allLines.filter((line) => {
                if (line.trim().length === 0 || line.trim().startsWith('=')) {
                    return false;
                }
                return true;
            });

            return withoutBlankLinesAndMarkdown.join(' ');
        }

        function removeDatesInParentheses(text) {
            return text.replace(/\((?:\([^()]*\)|[^()])*\)/gm, '').replace(/  /g,' ');
        }

    }

    function breakContentIntoSentences(content) {
        content.sentences = []

        const sentences = sentenceBoundaryDetection.sentences(content.sourceContentSanitized );
        sentences.forEach((sentence) => {
            content.sentences.push({
                text: sentence,
                keywords: [],
                images: []
            })
        })
    }

    async function fetchKeywordsOfAllSentences(content) {
        for (const sentence of content.sentences) {
            sentence.keywords = await fetchChatGPTAndReturnKeywords(sentence.text)
        }
    }

    async function fetchChatGPTAndReturnKeywords(sentence) {
 
        const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

        const config = new Configuration({
            apiKey: OPENAI_API_KEY
        });

        const openai = new OpenAIApi(config);

        const prompt = `Get keywords for the sentence (only the real important ones): ${sentence}`;

        try {
            const response = await openai.createCompletion({
                model: "text-davinci-003",
                prompt: prompt,
                temperature: 0,
                max_tokens: 100,
                stop: ["\"\"\""],
                presence_penalty: 0,
                frequency_penalty: 0,
                top_p: 1.0
            });
            const keywords = sanitizeAndTransformStringToList(response.data.choices[0].text);
            return keywords;
        } catch (error) {
            console.error('Error', error);
            throw new Error('Fail to get keywords for sentences.');
        }
    }

    function sanitizeAndTransformStringToList(str){
        const list = str.split('\n').map((item) => item.trim().replace(/^\-/, ''));
        return list.filter((item) => item !== '');
    }

    function limitMaximumSentences(content){
        content.sentences = content.sentences.slice(0, content.maximumSentences);
    }
}

module.exports = robot