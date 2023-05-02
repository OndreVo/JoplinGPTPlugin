import joplin from "api";
import { checkByNoteId, countEmbeddings, deleteChunks, insertChunk, insertEmbedding, readChunks, topChunks, updateEmbedding, log } from "./database";
import { getOpenAIAPI, getOpenAIModel } from "./openaiAPI";
import { createNoteEmbeddings, createQueryEmbedding } from "./textEmbeddings";
import { closeProgressbar, openProgressbar, updateProgressbar } from "../ui/progressbar/progressbar";

const COSINE_SIM_THRESHOLD = 0.72;
const PROMPT_SEPARATOR = '\n"""\n';

/*
//dokumentace zde: https://platform.openai.com/docs/api-reference/chat/create?lang=node.js
*/
export interface GPTResponse {
    response: string;
    metadata: object;
    success: boolean;
}

export class Interaction {
    prompt: string;
    response: string;
    type: string;
}

async function updateEmbeddingForNoteInternal(embeddingsId:number, note) {
    console.log("Updating embedding internal");
    const noteId: string = note.id;
    const noteUpdatedTime: number = +note.user_updated_time;
    const noteTitle = note.title;
    const noteBody = note.body;
    //const noteTags = [];
    const noteTagsResult = (await joplin.data.get(["notes", noteId, "tags"], { fields: "title" }));
    const noteTags = noteTagsResult.items.map((tag) => tag.title);
    

    console.log("Updating embedding for note: " + noteId + " title: " + noteTitle + " tags: " + noteTags.join(';') + " body: " + noteBody);

    const text = 'Title: ' + noteTitle
        + ' Tags: ' + noteTags.join(';')
        + ' Body: ' + noteBody;

    const chunks = await createNoteEmbeddings(text);
    let eId = embeddingsId;
    if (embeddingsId >= 0) { //update
        await updateEmbedding(embeddingsId, noteTitle, noteUpdatedTime);
        await deleteChunks(embeddingsId);
    } else { //insert
        eId = await insertEmbedding(noteId, noteTitle, noteUpdatedTime);
    }

    for (let chunk of chunks) {
        const serializedEmbeddings = JSON.stringify(chunk.embedding);
        await insertChunk(eId, chunk.text, serializedEmbeddings);
    }
}

async function updateEmbeddingForNote(note) {
    const noteId: string = note.id;
    const noteUpdatedTime: number = +note.user_updated_time;

    log("Info: Updating embedding for note: " + noteId + " updated: " + noteUpdatedTime);

    const curr = await checkByNoteId(noteId);    
    if (!curr || !curr["updated"] || curr["updated"] < noteUpdatedTime) {
        const embeddingsId = curr ? curr["id"] : -1;
        await updateEmbeddingForNoteInternal(embeddingsId, note);
    }
}

function getStringFromChunks(chunks: any[][], scoreHash: number[]): string {
    return chunks.map((chunk) => {
        return `Note title: ${chunk["title"]}${PROMPT_SEPARATOR}Note id: ${chunk["noteId"]}${PROMPT_SEPARATOR}Note relevancy: ${scoreHash[chunk["id"]]}${PROMPT_SEPARATOR}Note content: ${chunk["content"]}`;
    }).join(PROMPT_SEPARATOR);
}

function getResponseFromChunks(chunks: any[][]): string {
    return chunks.map((chunk) => {
        return `- [${chunk["title"]}](:/${chunk["noteId"]})`;
    }).join('\n');
}

function readMetadataFromCompletion(completion: any): object {
    return completion.data.usage;
}

async function topChunksByQuery(query: string, size: number = 10) {
    const queryEmbedding = await createQueryEmbedding(query);
    console.log("Query embedding: " + JSON.stringify(queryEmbedding));
    const chunks = await topChunks(async (row) => {
        if (!row["embeddings"]) return 0;
        const chunkEmbedding:Array<number> = JSON.parse(row["embeddings"]);
        const score = chunkEmbedding.reduce(
            (sum, val, i) => sum + val * queryEmbedding[i],
            0
        );
        if (score < COSINE_SIM_THRESHOLD) return 0;
        return score;
    }, size);        
    return chunks;
}

function getPromptTemplate(options:any): string {
    let promptTemplate = `Use following notes to answer the given question. If you cannot answer, just output \"I don't know.\". Synthesize your answer from all relevant notes. ` +
    `Include list of all used notes at the end of your answer in format [Note title](:/Note id). Give the answer in markdown format.` + PROMPT_SEPARATOR +
    `Notes:${PROMPT_SEPARATOR}---CONTEXT---` + PROMPT_SEPARATOR +
    `Question: ---QUERY---`;
    if (options["opt-embeddings-only"]) {
        promptTemplate = '---CONTEXT------QUERY---';
    }
    return promptTemplate;
}

async function addContextCurrentNote(context:string): Promise<string>
{
    const selectedNote = await joplin.workspace.selectedNote();
    if (context) context += PROMPT_SEPARATOR;
    context += `Note title: ${selectedNote.title}` +  PROMPT_SEPARATOR +
        `Note content: ${selectedNote.body}`;
    return context;
}

async function addContextSelectedText(context:string): Promise<string>
{
    const note = await joplin.workspace.selectedNote();
    if (note) {
        const selectedText = await joplin.commands.execute('selectedText');
        if (context) context += PROMPT_SEPARATOR;
        context += selectedText;
    }
    return context;
}

async function addContextRelevantNotes(context:string, query:string): Promise<string>
{
    const count = await countEmbeddings();
    if (count == 0) throw new Error("I couldn't find the answer. No documents indexed.");
    console.log("Found " + count + " embeddings");
    const chunkIds = await topChunksByQuery(query);
    if (chunkIds.length == 0) throw new Error("I couldn't find the answer. No relevant documents found.");
    const scoreHash = [];
    const IDs = [];
    chunkIds.forEach((c) => { scoreHash[c["chunkId"]] = c["score"]; IDs.push(c["chunkId"]); });
    const chunks = await readChunks(IDs);
    const filesString = getStringFromChunks(chunks, scoreHash);
    if (context) context += PROMPT_SEPARATOR;
    context += filesString;
    return context;
}

async function addContextConversation(context:string, conversation:Interaction[]): Promise<string>
{
    if (context) context += PROMPT_SEPARATOR;
    let conversationString = "";
    conversation.forEach((interaction) => {
        conversationString += `User: ${interaction.prompt}` + PROMPT_SEPARATOR +
            `Bot: ${interaction.response}` + PROMPT_SEPARATOR;
    });
    context += conversationString;
    return context;
}

async function getContext(query:string, options:any, conversation:Interaction[]): Promise<string>
{
    let context = "";
    if (options["opt-current-note"]) {
        context = await addContextCurrentNote(context);
    }
    if (options["opt-selected-text"]) {
        context = await addContextSelectedText(context);
    }
    if (options["opt-relevant-notes"]) {
        context = await addContextRelevantNotes(context, query);
    }
    if (options["opt-conversation"]) {
        context = await addContextConversation(context, conversation);
    }
    return context;
}

async function getOutput(prompt:string, options:any): Promise<GPTResponse> {
    if (options["opt-prompt-only"]) {
        return {
            response: prompt,
            metadata: null,
            success: true
        };
    } else if (options["opt-embeddings-only"]) {
        return await embeddingsSearch(prompt);
    } else {
        return await callGPT(prompt);
    }
}

async function callGPT(query: string): Promise<GPTResponse> {
    const openai = await getOpenAIAPI();
    try {
        const completion = await openai.createChatCompletion({
            model: await getOpenAIModel(),
            messages: [{ role: "user", content: query }],
        });
        console.log("Completion: " + JSON.stringify(completion));
        return {
            response: completion.data.choices[0].message.content,
            metadata: readMetadataFromCompletion(completion),
            success: true
        };
    } catch (e) {
        let msg = e.message;
        if (e.response && e.response.data) {
            if (e.response.data.error) {
                msg = e.response.data.error.message;
            } else {
                msg += "; " + JSON.stringify(e.response.data);
            }
        }
        return {
            response: msg,
            metadata: null,
            success: false
        };
    }
    
}

async function embeddingsSearch(query: string): Promise<GPTResponse> {
    const count = await countEmbeddings();
    if (count == 0) return { response: "I couldn't find the answer. No documents indexed.", metadata: null, success: false };
    console.log("Found " + count + " embeddings");
    const chunkIds = await topChunksByQuery(query);
    if (chunkIds.length == 0) return { response: "I couldn't find the answer. No relevant documents found.", metadata: null, success: false };
    const chunks = await readChunks(chunkIds.map((c) => c["chunkId"]));
    const markdownList = getResponseFromChunks(chunks);
    
    return {
        response: markdownList,
        metadata: null,
        success: true
    };
}

export async function updateEmbeddings() {
    let query = await joplin.settings.value("queryToIndex");
    let pageNum = 1;
    let notesToIndex = null;
    do {
        notesToIndex = await joplin.data.get(["search"], {
            query: query,
            fields: "id, title, body, user_updated_time",
            limit: 100,
            page: pageNum,
        });
        await openProgressbar("Updating embeddings", notesToIndex.items.length + " (page "+pageNum+")");        
        let i = 0;
        for (let notesToIndexKey in notesToIndex.items) {
            try {
                const note = notesToIndex.items[notesToIndexKey];
                await updateEmbeddingForNote(note);
                await updateProgressbar(++i);
            } catch (e) {
                log("Error updateEmbeddings.for: " + e);
            }
        }
        pageNum++;
    } while (notesToIndex.has_more);
    await closeProgressbar();
}

export async function search(query: string, options:any, conversation:Interaction[]): Promise<GPTResponse> {
    options = options || {}
    const promptTemplate = getPromptTemplate(options);
    let context = null;
    try {
        context = await getContext(query, options, conversation);
    } catch (e) {
        return {
            response: e.message,
            metadata: null,
            success: false
        };
    }    
    const prompt = context?
        promptTemplate.replace("---CONTEXT---", context).replace("---QUERY---", query) 
        : query;
    return await getOutput(prompt, options);
}
