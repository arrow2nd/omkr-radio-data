import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.14-alpha/deno-dom-wasm.ts";
import { RadioItem } from "../type.ts";
import { fetchRadioUrl } from "../fetchRadioUrl.ts";

//------------------------------------------------
const radioName = "";
const tagName = "";
// const numRegExp = `【\(\\d\+\)】${radioName}`;
const numRegExp = `${radioName}\(\\d\+\)`;
//------------------------------------------------

const results: RadioItem[] = [];

for (let pageNum = 1; ; pageNum++) {
  console.log(`< page = ${pageNum} >`);

  const res = await fetch(
    `https://omocoro.jp/tag/${decodeURIComponent(tagName)}/page/${pageNum}/`
  );
  if (res.status !== 200) {
    console.log("[END]");
    break;
  }

  const html = await res.text();
  const doc = new DOMParser().parseFromString(html, "text/html");
  if (!doc) throw new Error("解析エラー");

  const data = doc.getElementsByClassName("title").map((e) => {
    const href = e.getElementsByTagName("a")[0]?.getAttribute("href") || "";
    return {
      title: e.innerText,
      url: href,
    };
  });

  console.log(data);

  for (const { title, url } of data) {
    // ラジオではない
    if (!/^https:\/\/omocoro.jp\/(radio|rensai)/.test(url)) continue;

    // タイトルから話数を抽出
    const matched = title.match(numRegExp);
    if (!matched) {
      console.log(`[NOT FOUND] ${title}`);
      continue;
    }

    const num = matched[1];

    // ラジオのURLを取得
    const radioUrl = await fetchRadioUrl(url);
    if (radioUrl === "") continue;

    console.log(`[GET] ${num} ${radioUrl}`);

    // 2秒待つ
    await new Promise((resolve) => setTimeout(resolve, 2000));

    results.push({
      title,
      num: Number(num),
      url: radioUrl.replace("https://omocoro.heteml.net/radio/", ""),
    });
  }
}

// 昇順でソート
const sorted = results.sort((a, b) => a.num - b.num);
console.log(sorted);

Deno.writeTextFileSync(
  `./${radioName}.json`,
  JSON.stringify(sorted, null, "\t")
);
