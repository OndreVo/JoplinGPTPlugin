import { chunkText } from "./chunkText";
import { getOpenAIAPI, getOpenAIEmbeddingsModel } from "./openaiAPI";


// There isn't a good JS tokenizer at the moment, so we are using this approximation of 4 characters per token instead. This might break for some languages.
const MAX_CHAR_LENGTH = 250 * 4;

// This function takes a string or array of strings and returns an array of embeddings for each string by calling OpenAI API
async function embedding(input: string | string[]): Promise<number[][]> {
    const openai = await getOpenAIAPI();
    const result = await openai.createEmbedding({
        model: await getOpenAIEmbeddingsModel(),
        input,
    });

    if (!result.data.data[0].embedding) {
        throw new Error("No embedding returned from the completions endpoint");
    }

    return result.data.data.map((d) => d.embedding);
}

// This function takes a text and returns an array of embeddings for each chunk of the text
// The text is split into chunks of a given maximum charcter length
// The embeddings are computed in batches of a given size
async function getEmbeddingsForText(
    text:string,
    maxCharLength:number = MAX_CHAR_LENGTH,
    batchSize:number = 20,
): Promise<TextEmbedding[]> {
    const textChunks = chunkText({ text, maxCharLength });

    const batches = [];
    for (let i = 0; i < textChunks.length; i += batchSize) {
        batches.push(textChunks.slice(i, i + batchSize));
    }

    try {
        const batchPromises = batches.map((batch) => embedding(batch));

        const embeddings = (await Promise.all(batchPromises)); //number[][][]
        const flatten = embeddings.reduce((a, b) => a.concat(b), []);

        const textEmbeddings = flatten.map((embedding, index) => ({
            embedding,
            text: textChunks[index],
        }));

        return textEmbeddings;
    } catch (error) {
        console.log("Error: ", error);
        return [];
    }
}

export interface TextEmbedding {
    text: string;
    embedding: number[];
}

export async function createQueryEmbedding(query:string) {
    const searchQueryEmbeddingResponse = await embedding(query);
    const searchQueryEmbedding =
    searchQueryEmbeddingResponse.length > 0
      ? searchQueryEmbeddingResponse[0]
      : [];
    return searchQueryEmbedding;
}

export async function createNoteEmbeddings(text:string): Promise<TextEmbedding[]> {
    try {
        const textEmbeddings = await getEmbeddingsForText(text);
        return textEmbeddings;
        /* //zatim k nicemu meanEmbedding nepotrebuju
        // If there are 0 or 1 embeddings, the mean embedding is the same as the embedding
        if (textEmbeddings.length <= 1) {
            return {
                meanEmbedding: textEmbeddings[0]?.embedding ?? [],
                chunks: textEmbeddings,
            };
        }

        // If there are multiple embeddings, calculate their average
        const embeddingLength = textEmbeddings[0].embedding.length;
        const meanEmbedding = [];
        for (let i = 0; i < embeddingLength; i++) {
            // Sum up the values at the same index of each embedding
            let sum = 0;
            for (const textEmbedding of textEmbeddings) {
                sum += textEmbedding.embedding[i];
            }
            // Divide by the number of embeddings to get the mean
            meanEmbedding.push(sum / textEmbeddings.length);
        }

        return {
            meanEmbedding,
            chunks: textEmbeddings,
        };
        */
    } catch (error) {
        console.log("Error: ", error);
        return [];
    }
}