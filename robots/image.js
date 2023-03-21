const google = require('googleapis').google;
const customSearch = google.customsearch('v1');
const imageDownloader = require('image-downloader');
require('dotenv').config();
const state = require('./state.js');
const path = require('path');

const googleSearchCredentials = {
    apiKey: process.env.GOOGLE_API_KEY,
    searchEngineId: process.env.SEARCH_ENGINE_ID
}

async function robot() {
    const content = state.load();
 
    await fetchImagesOfAllSetences(content);
    await downloadAllImages(content);
    
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

    async function downloadAllImages(content) {
        content.downloadedImages = []

        for(let sentenceIndex = 0; sentenceIndex < content.sentences.length; sentenceIndex++){
            const images = content.sentences[sentenceIndex].images;

            for(let imageIndex = 0; imageIndex < images.length; imageIndex++){
                const imageUrl = images[imageIndex];

                try {
                    if (content.downloadedImages.includes(imageUrl)){
                        throw new Error('Imagem já baixada');
                    }
                    await downloadAndSaveImage(imageUrl, `${sentenceIndex}-original.png`);
                    content.downloadedImages.push(imageUrl);
                    console.log(`> [${sentenceIndex}][${imageIndex}] Baixou imagem com sucesso: ${imageUrl}`);
                    break;
                } catch(error){
                    console.log(`> [${sentenceIndex}][${imageIndex}] Erro ao baixar (${imageUrl}): ${error}`);
                }
            }
        }
    }

    async function downloadAndSaveImage(url, fileName){
        return imageDownloader.image({
            url: url,
            dest: path.resolve(`./content/${fileName}`)
        })
    }
}

module.exports = robot;