import { DOMParser } from "../deps.ts";

import { parseTitle } from "./parse.ts";
import { getId } from "./id.ts";

type FetchResult = {
  id?: string;
  radioTitle: string;
  tagName: string;
  tagLink: string;
  episodeTitle: string;
  episodeNumber?: number;
  desc: string;
  pubDate: string;
  author: string;
  thumbnail: string;
  source: string;
};

/**
 * エピソード情報を取得
 * @param url URL
 * @returns 結果
 */
export async function fetchEpisodeInfo(
  url: string
): Promise<FetchResult | undefined> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`アクセスできませんでした (${res.status})`);
  }

  console.log(`[OK] 取得完了 (${res.status})`);

  // HTMLをパース
  const html = await res.text();
  const doc = new DOMParser().parseFromString(html, "text/html");
  if (!doc) {
    throw new Error("HTMLの解析に失敗しました");
  }

  console.log(`[OK] パース完了`);

  // タグを抽出
  const tagName = [...doc.querySelectorAll(".tags > a")]
    .filter((e) => e.textContent !== "#ラジオ")
    .map((e) => e.textContent)[0]
    .replace(/^#\s*/, "");
  const tagLink = `https://omocoro.jp/tag/${encodeURIComponent(
    tagName || "ラジオ"
  )}`;

  console.log("タグ: " + tagName);
  console.log("タグリンク: " + tagLink);

  // タイトルを抽出
  const title = doc
    .querySelector(".header-meta > .title")
    ?.textContent.replace(/\n/g, "");
  if (!title) {
    throw new Error("タイトルの抽出に失敗しました");
  }

  const parsed = parseTitle(title);
  if (!parsed) {
    console.log(`[SKIP] 未知のタイトルフォーマットです (${title})`);
    return undefined;
  }

  let { radioTitle, episodeTitle, episodeNumber } = parsed;

  if (!radioTitle) {
    radioTitle = prompt("ラジオのタイトル名") || "不明";
  }

  console.log("ラジオタイトル: " + radioTitle);
  console.log("エピソードタイトル: " + episodeTitle);
  console.log("エピソード番号: " + episodeNumber);

  // 概要を抽出
  const desc = doc.querySelector(".description")?.textContent || "";

  console.log("概要: " + desc);

  // 投稿日
  const date = doc
    .querySelector(".date")
    ?.textContent.split("-")
    .map((e) => parseInt(e));

  if (!date) {
    throw new Error(`投稿日が抽出できませんでした (${url})`);
  }

  const pubDate = new Date(date[0], date[1] + 1, date[2]).toUTCString();

  console.log("投稿日: " + pubDate);

  // 出演者を抽出
  const author = [...doc.querySelectorAll(".header-meta > .staffs > a")]
    .map((e) => e.textContent)
    .join(",");

  console.log("出演: " + author);

  // サムネイルを抽出
  const thumbnail =
    doc.querySelector(".article-header > .image > img")?.getAttribute("src") ||
    "https://omocoro.jp/assets/img/common/omocoro-logo.png";

  console.log("サムネイル: " + thumbnail);

  // 音源のURLを抽出
  const source = html.match(
    /(https:\/\/omocoro\.heteml\.net\/radio\/.*?\.mp3)/
  )?.[1];

  if (!source) return undefined;

  console.log("音源: " + source);

  // ラジオIDを抽出
  const id = getId(radioTitle, source);

  console.log("ID: " + id);

  return {
    id,
    tagName,
    tagLink,
    radioTitle,
    episodeTitle,
    episodeNumber,
    desc,
    pubDate,
    author,
    thumbnail,
    source,
  };
}
