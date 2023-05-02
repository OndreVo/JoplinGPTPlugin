import joplin from "api";
const fs = joplin.require('fs-extra')
const sqlite3 = joplin.require('sqlite3')

let database = null;
let logPath = null;

async function createTables() {
    let createFilesTable = `
        CREATE TABLE IF NOT EXISTS NotesEmbeddings (
            id INTEGER PRIMARY KEY,
            noteId TEXT NOT NULL,
            title TEXT NOT NULL,
            updated INTEGER NOT NULL
        )
    `;

    let createChunksTable = `
        CREATE TABLE IF NOT EXISTS Chunks (
            id INTEGER PRIMARY KEY,
            noteEmbeddingsId INTEGER NOT NULL,
            content TEXT NOT NULL,
            embeddings TEXT NOT NULL
        )
    `;

    let createMetadataTable = `
        CREATE TABLE IF NOT EXISTS Metadata (
            id INTEGER PRIMARY KEY,
            key TEXT NOT NULL,
            value TEXT NOT NULL
        )
    `;
    await runQuery('run', createMetadataTable, {});
    await runQuery('run', createFilesTable, {});
    await runQuery('run', createChunksTable, {});

}

function containsColumn(tableInfo, columnName) {    
    return tableInfo.some((element, _index, _array) => {
        return (element["name"] == columnName)
    });
}

async function applyDatabaseUpgrades() {
    /* //no upgrades so far
    let tableInfo = await runQuery('all', `PRAGMA TABLE_INFO('Embeddings')`, {})
    if (!containsColumn(tableInfo, "newColumn")) {
        await runQuery('run', `ALTER TABLE Embeddings ADD newColumn INTEGER DEFAULT 0`, {})
    }
    */
}

async function runQuery(func, SQLQuery, parameters): Promise<any> {
    return await new Promise(
        (resolve, reject) => {
            database[func](SQLQuery, parameters, (err, row) => { err ? reject(err) : resolve(row) })
        }
    );
}

export async function checkByNoteId(noteId:string): Promise<Array<any>> {
    let result = await runQuery('get', `SELECT id, updated FROM NotesEmbeddings WHERE noteId = $id`, {$id: noteId});
    return result;
}

export async function insertEmbedding(noteId:string, title:string, updated:number):Promise<number> {
    await database.run(`INSERT INTO NotesEmbeddings (noteId, title, updated) VALUES ($id, $title, $updated)`, {$id: noteId, $title: title, $updated: updated});
    const result = await checkByNoteId(noteId);
    return result["id"];
}

export async function updateEmbedding(id:number, title:string, updated:number) {
    await runQuery('run', `UPDATE NotesEmbeddings SET updated = $updated, title = $title WHERE id = $id`, {$id: id, $title: title, $updated: updated});    
}

export async function insertChunk(noteEmbeddingsId:number, content:string, embeddings:string) {
    await runQuery('run', `INSERT INTO Chunks (noteEmbeddingsId, content, embeddings) VALUES ($noteEmbeddingsId, $content, $embeddings)`, {$noteEmbeddingsId: noteEmbeddingsId, $content: content, $embeddings: embeddings});
}

export async function deleteChunks(noteEmbeddingsId:number) {
    await runQuery('run', `DELETE FROM Chunks WHERE noteEmbeddingsId = $noteEmbeddingsId`, {$noteEmbeddingsId: noteEmbeddingsId});
}

export async function topChunks(getChunkScore, top:number):Promise<Array<any>> {
    let topRows = [];
    await new Promise((resolve, reject) => {
        database.each("SELECT id, embeddings FROM Chunks", async (err, row) => {
            if (err) reject(err);
            const score = await getChunkScore(row);
            if (score > 0) {
                if (topRows.length < top) {
                    topRows.push({ score: score, chunkId: row["id"] });                
                    if (topRows.length >= top) topRows.sort((a, b) => b.score - a.score);
                } else if (topRows[top - 1].score < score) {
                    topRows[top - 1] = { score: score, chunkId: row["id"] };                
                    topRows.sort((a, b) => b.score - a.score);
                }
            }
            
        }, function(err, num) {
            if (err) reject(err);            
            resolve(topRows);
        });  
    });
    return topRows;      
}

export async function readChunks(ids:Array<number>):Promise<Array<Array<any>>> {
    const sql = `
    SELECT Chunks.id, content, noteId, title FROM Chunks 
        INNER JOIN NotesEmbeddings ON Chunks.noteEmbeddingsId = NotesEmbeddings.id
    WHERE Chunks.id IN (${ids.join(",")})`;
    console.log("readChunks SQL: " + sql);
    return await runQuery('all', sql, {});    
}

export async function setupDatabase() {
    let pluginDir = await joplin.plugins.dataDir();
    let databasePath = pluginDir + "/embeddings.sqlite3";
    console.log("Database path: " + databasePath);
    await fs.ensureDir(pluginDir);
    database = new sqlite3.Database(databasePath);
    await createTables();
    await applyDatabaseUpgrades();
    logPath = pluginDir + "/dev.log";
}

export async function log(message:string) {
    await fs.appendFile(logPath, message + "\n");
}

export async function countEmbeddings() {
    let result = await runQuery('get', `SELECT COUNT(*) as count FROM NotesEmbeddings`, {});
    return result["count"];
}