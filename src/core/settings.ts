import joplin from "api"
import { SettingItemType } from "api/types"
import { reloadSettings } from "./openaiAPI";

export async function setupSettings() {
	await joplin.settings.registerSection(
		"gptsection", {
			label: "GPT",
			iconName: 'fas fa-cogs',
			description: "Settings for the GPT Plugin",
			name: "gptsection"
		});
    
    await joplin.settings.registerSettings({
        "currentProfileID": {
            label: "The ID of the current profile used by GPT",
            value: null,
            type: SettingItemType.Int,
            public: false,
            section: 'gptsection',
        },        
        "openAIAPIKey": {
            label: "OpenAI API Key",
            value: '',
            type: SettingItemType.String,
            public: true,
            section: 'gptsection',
        },
        "openAIModel": {
            label: "OpenAI Model",
            value: 'gpt-3.5-turbo',
            type: SettingItemType.String,
            public: true,
            section: 'gptsection',
        },
        "openAIEmbeddingModel": {
            label: "OpenAI Embeddings Model",
            value: 'text-embedding-ada-002',
            type: SettingItemType.String,
            public: true,
            section: 'gptsection',
        },
        "maxTokens": {
            label: "Maximum tokens per request",
            value: 10,
            type: SettingItemType.Int,
            public: true,
            section: 'gptsection',
        },
        "queryToIndex": {
            label: "Query selecting notes to index",
            value: 'gpt-include',
            type: SettingItemType.String,
            public: true,
            section: 'gptsection',
        },
        "savedQueryOptions": {
            label: "Savced Query Type",
            value: 'prompt',
            type: SettingItemType.String,
            public: false,
            section: 'gptsection',
        },
    });
    await joplin.settings.onChange(reloadSettings);
}