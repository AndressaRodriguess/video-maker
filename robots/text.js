const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const sentenceBoundaryDetection  = require('sbd')
async function robot(content) {
    await fetchContentFromWikipedia(content);
    sanitizeContent(content);
    breakContentIntoSentences(content)

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
}

module.exports = robot