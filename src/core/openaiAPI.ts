import joplin from "api";
import { Configuration, OpenAIApi } from "openai";

let openai = null;
let model = "gpt-3.5-turbo";
let embeddingsModel = "text-embedding-ada-002";
let maxTokens = 1000;

async function ensureOpenAI() {
    if (openai) return;
    const apiKey = await joplin.settings.value("openAIAPIKey");
    const configuration = new Configuration({
        apiKey: apiKey,
    });
    openai = new OpenAIApi(configuration);
}

async function ensureSettings() {
    if (model) return;
    model = await joplin.settings.value("openAIModel");
    embeddingsModel = await joplin.settings.value("openAIEmbeddingModel");
    maxTokens = await joplin.settings.value("maxTokens");
    console.log("OpenAI settings: model: " + model + " embedding model: " + embeddingsModel + " max tokens: " + maxTokens);
}

export async function reloadSettings() {
    openai = null;
    model = null;
    await ensureSettings();
}

export async function getOpenAIModel() {
    await ensureSettings();
    return model;
}

export async function getOpenAIEmbeddingsModel() {
    await ensureSettings();
    return embeddingsModel;
}

export async function getOpenAIAPI() {
    await ensureSettings();
    await ensureOpenAI();
    return openai;
}