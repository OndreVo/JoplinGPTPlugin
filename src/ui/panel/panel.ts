import joplin from "api";
import { Interaction, search } from "../../core/openaiService";

const fs = joplin.require('fs-extra');

let panel = null;
let baseHtml = "";
let conversation:Interaction[] = [];
let currentQueryOptions = null;

const queryOptions = [
    {label: '<i class="fa fa-font" aria-hidden="true"></i>', title: "Include selected text", value: "opt-selected-text", disabled: false},
    {label: '<i class="fa fa-file" aria-hidden="true"></i>', title: "Include current note", value: "opt-current-note"},
    {label: '<i class="fa fa-copy" aria-hidden="true"></i>', title: "Include relevant notes", value: "opt-relevant-notes"},
    {label: '<i class="fa fa-comments" aria-hidden="true"></i>', title: "Include conversation", value: "opt-conversation", disabled: false},
    {label: 'Local only', title: "Local search only", value: "opt-embeddings-only"},
    {label: 'Prompt only', title: "Output only prompt", value: "opt-prompt-only"}
]

/**
 * Creates the panel in joplin and connects the event handler
 */
export async function setupPanel(){
    panel = await joplin.views.panels.create('gptsearchpanel');    
    await joplin.views.panels.setHtml(panel, 'loading...');
    let htmlPath = (await joplin.plugins.installationDir()) + "/ui/panel/panel-intern.html";
    baseHtml = await fs.readFile(htmlPath, "utf-8");    
    await joplin.views.dialogs.addScript(panel, '/ui/panel/panel-intern.js');
    await joplin.views.dialogs.addScript(panel, '/ui/panel/panel-intern.css');    
    await joplin.views.panels.onMessage(panel, eventHandler);
    await updatePanel();
}

function htmlEncode(rawStr:string = ''):string {
    let encodedStr = rawStr;    
    encodedStr = encodedStr.replace(/[\u00A0-\u9999<>\&]/g, function(i) {
        return '&#'+i.charCodeAt(0)+';';
     });
    encodedStr = encodedStr.replace('\n', '<br />');
    return encodedStr;
}

function saveQueryType(queryOptions: string) {
    currentQueryOptions = queryOptions;
    joplin.settings.setValue("savedQueryOptions", JSON.stringify(currentQueryOptions));
}

async function eventHandler(message){
    console.log('Event: ' + message[0]);
    if (message[0] == 'testEventClicked'){
        console.log(message[1]);
    } else if (message[0] == 'submitQueryClicked'){
        let result = await search(message[1], message[2], conversation);
        saveQueryType(message[2]);        
        if (result) {
            conversation.push({'prompt': htmlEncode(message[1]), 'response': (result.success?'':'Error: ') + htmlEncode(result.response), 'type': result.success?'success':'error'});
        }
        
        updatePanel();
    } else if (message[0] == 'useResponseClicked'){
        await useResponseInNote(message[1]);        
    } else if (message[0] == 'clearClicked'){
        conversation = [];
        updatePanel();
    }
}

async function useResponseInNote(text:string) {
    const note = await joplin.workspace.selectedNote();
    if (note) {
        //await joplin.commands.execute('editor.focus');
        await joplin.commands.execute('insertText', text);
    }
}

async function getCurrentQueryOptions(): Promise<object> {
    if (!currentQueryOptions) {
        const savedQueryOptions = await joplin.settings.value("savedQueryOptions");
        if (savedQueryOptions) { 
            try {
                currentQueryOptions = JSON.parse(savedQueryOptions); 
            } catch (e) { } //no need to do anything here, just ignore the error
        }
    }
    if (!currentQueryOptions) {
        currentQueryOptions = {};
    }    
    return currentQueryOptions;
}

export async function updatePanel() {
    let htmlString = baseHtml;
    let conversationHtml = "";
    conversation.forEach(element => {
        conversationHtml = '<div class="gpt-query-interaction type-'+element.type+'"><div class="gpt-query-prompt">' + element.prompt + '</div><div class="gpt-query-result"><p>' + element.response + '</p><div><span onclick="onUseResponseClicked(this)" title="Use response in current note"><i class="fa fa-share-square" aria-hidden="true"></i> Use</span></div></div></div>' + conversationHtml;
    });
    let queryOptionsHtml = "";
    const selectedQueryOptions = await getCurrentQueryOptions();
    queryOptions.forEach(element => {
        queryOptionsHtml += '<label title="'+ element.title + '">'
            + '<input class="q-opt" type="checkbox" id="' + element.value + '" '  
            + (selectedQueryOptions[element.value] ? 'checked' : '') 
            + (element.disabled ? 'disabled' : '') + '> ' 
            + element.label + '</label>';
    });
    
    htmlString = htmlString.replace("<!---CONTENT--->", conversationHtml);
    htmlString = htmlString.replace("<!---QUERY-OPTIONS--->", queryOptionsHtml);
    await joplin.views.panels.setHtml(panel, htmlString);
}

export async function togglePanelVisibility() {
    let visibility = await joplin.views.panels.visible(panel);
    await joplin.views.panels.show(panel, !visibility);
}


