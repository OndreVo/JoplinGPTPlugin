# GPT

This plugin allows users to more easily create and search their notes, making them more useful. It uses power of Large Language Models (like Chat GPT) to help with writing, searching, summarizing etc. 

## Use Cases

These are just examples how to use this plugin.

### Start with new note

Don't get stuck with a blank page.
- create new note
- in GPT panel write something like "Make me an outline for a blogpost on Papuan customs" and click Submit
- when answer is ready, click "Use" next to the answer
- change outline as you wish and continue

### Shorten and simplification

Do you need a short version?
- open your note
- in GPT panel write something like "In 5 sentences, summarize this note"
- select "Include current note" query option (checkbox second from left)
- click Submit
- create new note or position cursor in current note and click Use next to the answer
- fix any text issues if necessary

### Rewrite

Tired of rewriting?
- open your note
- select text which you want to rewrite
- in GPT panel write something like "Rewrite this text to be more formal"
- select "Include selected text" query option (first checkbox from left)
- click Submit
- position cursor after the selected text and click Use next to the answer
- fix any text issues if necessary

### Find related notes

What notes are somehow related to current note?
- open your note
- in GPT panel, select "**Include current note**" (checkbox second from left) and "**Local only**"
- click Submit
- position cursor at the and of your note and click "Use" next to the answer
- go through given notes and keep those you see relevant

### Summarization

What do I have in my notes?
- in GPT panel, write something like "Summarize notes about storytelling"
- select "Include relevant notes" query option (third from left)
- click Submit
- Use the answer

Other usage ideas: Find argumentation gaps in this note, Continue with this note

## Disclaimer
- All indexed notes and queries (including all notes added to the query) are sent to OpenAI 
- Your OpenAI API key is used for embeddings and queries and you will be charged by OpenAI based on your subscription
- The developer is not affiliated with OpenAI in any way

## Instalation
- Install plugin from github
- Create your own OpenAI account at [openai.com](https://platform.openai.com/signup) and [API key](https://platform.openai.com/account/api-keys)
- Go to Options > GPT in Joplin 
    - set your OpenAI API Key
    - you can leave the models settings as they are
    - set maximum tokens (recommanded value is 1000)
    - set query which will select notes to index (eg. tag:gpt-include)
- Go to Tools > GPT > GPT Update Embeddings (this will call the OpenAI API and you may be charged for using it, also this will take quite a bit of time)

## Usage
- open GPT panel from menu of by pressing Ctrl+G
- write your query
- select query options (icons with tooltips - from left to right)
    - Include selected text - Adds text selected in the current note to the query
    - Include current note - Adds the current note to the query 
    - Include relevant notes - Search for relevant notes and add them to the query
    - Include conversation - Adds the entire current conversation to the query
    - Local only - Searches only the plugin's database to find relevant notes (does not call the GPT model)
    - Prompt only - Only displays text that would be sent to the GPT model but is not actually sent
- next to each answer, there is a button "Use" - by clicking it, you can insert this answer into current note

## How does it work
- This plugins keeps embeddings for each of your notes. Embeddings are a numerical representation of a text such that if the texts are thematically similar, so are their embeddings.
- The plugin searches for relevant notes by creating a query embedding and then matching it against its database of note embeddings.
- Then it joins your query and current note/relevant notes and sends it to OpenAI GPT model which produces an answer based on given notes

## Limitations
- Limit for a query including all relevant notes is 4000 tokens, which is roughly 16000 characters

## Future work
- render markdown links in answers
- shorten long notes and conversations to bypass token count limit
- automatically store entire conversation in a note
- better chunking
- work differently with "index" notes that contain only a list(s) of links to other notes




