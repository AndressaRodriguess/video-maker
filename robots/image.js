const google = require('googleapis').google;
const customSearch = google.customsearch('v1');
require('dotenv').config();
const state = require('./state.js');

const googleSearchCredentials = {
    apiKey: process.env.GOOGLE_API_KEY,
    searchEngineId: process.env.SEARCH_ENGINE_ID
}

async function robot() {
    const content = state.load();
 
    await fetchImagesOfAllSetences(content);
    state.save(content);

    async function fetchImagesOfAllSetences(content){
        for(const sentence of content.sentences){
            const query = `${content.searchTerm} ${sentence.keywords[0]}`;
            sentence.images = await fetchGoogleAndReturnImagesLinks(query);
            sentence.googleSearchQuery = query;
        }
    }

    async function fetchGoogleAndReturnImagesLinks(query){
        const response = await customSearch.cse.list({
            auth: googleSearchCredentials.apiKey,
            cx: googleSearchCredentials.searchEngineId,
            q: query,
            searchType: 'image',
            num: 2
        });
        const imagesUrl = response.data.items.map((item) => {
            return item.link
        });

        return imagesUrl;
    }    
}

module.exports = robot;