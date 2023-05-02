import joplin from 'api';
import { MenuItemLocation, ToolbarButtonLocation } from 'api/types';
import { setupDatabase } from './core/database';
import { updateEmbeddings } from './core/openaiService';
import { setupSettings } from './core/settings';
import { setupPanel, togglePanelVisibility } from './ui/panel/panel';
import { setupProgressbar } from './ui/progressbar/progressbar';

joplin.plugins.register({ onStart: setupPlugin })

async function setupCommands() {
    await joplin.commands.register({
        name: 'toggleGPTPanelVisibility',
        label: 'Toggle GPT Panel',
        iconName: 'fas fa-cogs',
        execute: togglePanelVisibility
    });
    await joplin.commands.register({
        name: 'gptUpdateEmbeddings',
        label: 'GPT Update Embeddings',
        iconName: 'fas fa-refresh',
        execute: updateEmbeddings
    });   
}

async function setupToolbar() {
    await joplin.views.toolbarButtons.create(
        'toggleGPTPanelVisibilityButton',
        'toggleGPTPanelVisibility', //command defined in setupCommands
        ToolbarButtonLocation.NoteToolbar
    );
}

async function setupMenu() {
    await joplin.views.menus.create(
        'gptMenu', 
        "GPT", 
        [
            {commandName: 'toggleGPTPanelVisibility', accelerator: 'Ctrl+G'},
            {commandName: 'gptUpdateEmbeddings'},
        ],
        MenuItemLocation.Tools
    )
}

export async function setupPlugin(){
    await setupDatabase();
    await setupSettings();
    await setupCommands();
    await setupToolbar();
    await setupMenu();
    await setupProgressbar();
    await setupPanel();
    //await setupEditor()
    //await setupTimer()
    //await refreshInterfaces()
}

