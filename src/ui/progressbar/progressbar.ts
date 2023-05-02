import joplin from "api";
const fs = joplin.require('fs-extra');

let baseHtml = null;
let currentHtml = null;
let dialog = null;

export async function setupProgressbar(){
    let htmlPath = (await joplin.plugins.installationDir()) + "/ui/progressbar/progressbar-intern.html";
    baseHtml = await fs.readFile(htmlPath, "utf-8");
    dialog = await joplin.views.panels.create('progressbar');
    await joplin.views.dialogs.addScript(dialog, '/ui/progressbar/progressbar-intern.css');
    await closeProgressbar();
}

export async function updateProgressbar(progress: number) {
    await joplin.views.panels.setHtml(dialog, currentHtml.replace('PROGRESS', progress.toString()));
}

export async function closeProgressbar() {
    await joplin.views.panels.setHtml(dialog, '');
    await joplin.views.panels.show(dialog, false);
}

export async function openProgressbar(action:string, items: string) {
    currentHtml = baseHtml.replace('ACTION', action).replace('ITEMS', items);
    await joplin.views.panels.setHtml(dialog, currentHtml.replace('PROGRESS', '0'));
    await joplin.views.panels.show(dialog, true);
}