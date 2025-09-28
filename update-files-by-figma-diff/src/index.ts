import { readFile, writeFile, readFileSync } from 'fs'
import { join } from 'path'

function changeFile(filePath: string, oldText: string, newText: string) {
    readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            throw new Error(`Read file error ${err}`);
        }

        const newData = data.replace(oldText, newText);
        if (newData === data) {
            console.log(`Replacing error in ${filePath}. Current string not found`);
            return;
        }

        writeFile(filePath, newData, 'utf8', err => {
            if (err) {
                throw new Error(`Write file error ${err}`);
            }
        });
    });
}

async function getCodePathByLLM(oldText: string, translations: Record<string, string>): Promise<string | undefined> {
    const LLM_ENDPOINT = process.env.LLM_ENDPOINT;
    const LLM_TOKEN = process.env.LLM_TOKEN;
    const LLM_MODEL = process.env.LLM_MODEL;
    let codePath = "";

    const llmResponse = await fetch(`${LLM_ENDPOINT}`, {
        method: "POST",
        headers: {
            "Authorization": `OAuth ${LLM_TOKEN}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
        model: LLM_MODEL,
        messages: [{
            role: 'user',
            content: `
Please search through all the string values of following Pairs Object and identify the file path where the string "${oldText}" is present.

Strict and relaxed character match:**  
Check for *all* matches where the entire candidate string exactly matches the query (allowing only differences in punctuation, spaces, dashes, or Unicode symbol variants).  
**The candidate string must match the query string as a whole, with no extra words before, after, or inside. Do NOT match if extra words are present or if the candidate string simply contains the phrase as a part.**  
Examples of acceptable relaxed matches:
- "Приветик-Пистолетик" ~ "Приветик Пистолетик"
- "Приветик—Пистолетик" ~ "Приветик-Пистолетик"
**Do NOT treat as a match if any words are changed, removed, replaced, or if there are extra words.**

***Collect and show all id(s) of such matches (exact or relaxed). If you found, after checking all the file, stop and print it.***

Some good and bad examples for "Приветик-Пистолетик":
- YES: "Приветик Пистолетик!" (punctuation difference)
- YES: "Пистолетик-приветик" (word order change, only if the meaning is unchanged)  
- NO: "Приветик и Пистолетик" 
- NO: "Coderun", "Привет", "Пистолет", "Поздоровались" (not the same phrase or meaning)

If you do not find anything fitting these criteria — return **None**.

***Output format ONLY: {codePath: codePath} or {codePath: 'None'}. Example: {codePath: 'src/components/Button.tsx'}***

Do not output unrelated, partial, or abstract matches!

Pairs object:

${translations}
        `
        }],
        response_format: {
            type: "json_schema",
            json_schema: {
            name: "id_response",
            schema: {
                type: "object",
                properties: {
                    codePath: { type: "string" },
                },
                required: ["codePath"],
                additionalProperties: false,
            },
            },
        },
        }),
    }).catch(error => {
        console.error(error);
    });

    if (!llmResponse) {
        throw new Error("Fetch returned undefined or null");
    }

    if (!llmResponse.ok) {
        throw new Error(`HTTP error! Status: ${llmResponse.status}`);
    }

    const llmData = await llmResponse.json();
    codePath = JSON.parse(llmData.response.choices[0].message.content).codePath;

    if (codePath === "None") {
        console.log(`- Code path not found for: "${oldText}"`);
    } else {
        return codePath;
    }
}

async function getCodePath(oldText: string, translations: Record<string, string>): Promise<string | undefined> {
    let codePath: string | undefined = "";

    Object.keys(translations).forEach(translatedText => {
        if (oldText === translatedText) {
            codePath = translations[translatedText];
        }
    });

    if (codePath === "") {
       codePath = await getCodePathByLLM(oldText, translations);
    }

    return codePath;
}

function getCodeAndTextPairs(translationsContent: string): Record<string, string> {
    const lines = translationsContent.split("\n");

    const result: Record<string, string> = {};

    let currentLocation: string | null = null;

    for (let line of lines) {
        line = line.trim();

        if (line.startsWith("#:")) {
            currentLocation = line.replace('#: ', '');
            continue
        }

        if (line.startsWith("msgstr") && currentLocation) {
            const match = line.match(/^msgstr\s+"(.*)"$/);
            if (match) {
                const text = match[1];
                result[text] = currentLocation;
            }
            currentLocation = null;
        }
    }

    return result;
}

interface MakeEditsParams {
    srcPath?: string | undefined;
    diffs: Array<Record<string, string>>;
}

export default async function makeEdits({ srcPath, diffs }: MakeEditsParams) {
    const mainDir = srcPath ? srcPath : process.cwd();
    const content = readFileSync(join(mainDir, 'src/locales/ru.po'), "utf-8");
    const translations = getCodeAndTextPairs(content);

    for (const textPair of Object.values(diffs)) {
        const [oldText, newText] = Object.entries(textPair)[0];

        const codePath = await getCodePath(oldText, translations);
        if (codePath) {
            changeFile(`${join(mainDir, codePath.split(':')[0])}`, oldText, newText);
            console.log(`- Edited ${join(mainDir, codePath)}. Old text: ${oldText}, new text: ${newText}`);
        }

    };
}
