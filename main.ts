import { Client } from "https://deno.land/x/notion_sdk/src/mod.ts";
import 'https://deno.land/std@0.192.0/dotenv/load.ts'
import { datetime, diffInDays, diffInMin } from "https://deno.land/x/ptera/mod.ts";
import { sleep } from "https://deno.land/x/sleep/mod.ts";

// const JP_NOW_TIME = datetime().toZonedTime("Asia/Tokyo").format("YYYY-MM-dd");
const JP_NOW_TIME = datetime().toZonedTime("Asia/Tokyo").toISO();
console.log(JP_NOW_TIME);

// Initializing a client
const notion = new Client({auth: Deno.env.get('NOTION_TOKEN') || ''});

//100件取得
const kadai_list = await notion.databases.query({
    database_id:  Deno.env.get('NOTION_KADAI_TEISYUTSU_DB_ID') || '',
    sorts: [
        {
            "property": "最終更新",
            "direction": "descending"
        }
    ]
})
console.log(kadai_list.results.length)
// console.log(kadai_list.results[1].properties['title']?.title[0]);

const updateInfo = async (recordId, trueTitle) => {
    try {
        //レコードのIDを指定して更新
        const response = await notion.pages.update({
            page_id: recordId,
            properties: {
                title: { 
                    type: 'title',
                    title: [
                        {
                            type: "text",
                            text: { content: trueTitle, link: null },
                            annotations: {
                            bold: false,
                            italic: false,
                            strikethrough: false,
                            underline: false,
                            code: false,
                            color: "default"
                            },
                            plain_text: trueTitle,
                            href: null
                        }
                    ]
                },
            },
        });
        return response;

    } catch (error) {
        console.log(error);
        throw new Error(error);
    }
}

kadai_list.results.filter(async kadai => {
    //学生が提出したタイトル
    const title:string = kadai.properties['title']?.title[0]?.plain_text || '';

    //peo05-0101_風炉斗逢人
    const GAKUSEI_NAME:string = kadai.properties['学生名（確認用）']?.formula?.string || '';
    const KADAI_ID:string = kadai.properties['課題ID']?.rollup?.array[0]?.formula?.string || '';
    const trueTitle:string = `${KADAI_ID}_${GAKUSEI_NAME}`;
    const last_edited_time:string = kadai.properties['最終更新']?.last_edited_time || '';
    const recordId:string = kadai.id || '';

    //学生名と課題IDがない場合はスキップ
    if(GAKUSEI_NAME === '' || KADAI_ID === '') return false;
    await sleep(2);

    console.log(`---start: ${last_edited_time}`);
    //学生のタイトルミスがあった場合
    if(title !== trueTitle) {
        console.log(`タイトル修正をします。`);
        const res = await updateInfo(recordId, trueTitle);
        // console.log(res);        
    }else{
        console.log(`タイトル正常: ${title}`)
    }

    console.log(`---end: \n`);
})

const encoder = new TextEncoder();
const contentBytes = encoder.encode(`${JP_NOW_TIME} 実行`);
// 書き込みモードでファイルオープン
const file = await Deno.open('log.txt', {write: true, create: true});
Deno.writeAllSync(file, contentBytes);
// ファイルを閉じる
Deno.close(file.rid);