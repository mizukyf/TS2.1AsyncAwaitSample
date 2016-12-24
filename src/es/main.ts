/// <reference path="../../node_modules/@types/jquery/index.d.ts" />
/// <reference path="../../node_modules/@types/es6-promise/index.d.ts" />

// jQueryをロードする（実際にはロジック内で使用していないので最終的なビルド成果物にコードは含まれない）
import * as $ from 'jquery';
// ES6より前の環境でasync/awaitを使うため前提となるポリフィルをロードする
import {polyfill} from 'es6-promise';
// ポリフィルを有効化する
polyfill();

// コンソールにあいさつを出力するだけのクラス
class Greeter {
  private x : string;
  constructor(x : string) {
    this.x = x;
  }
  greet() : void {
    // 同期的にあいさつを出力
    console.log(this.x);
  }
  async greetAsync() {
    // Promiseのコンストラクタに渡たす関数内のスコープでは
    // thisの意味が変わってしまうため、xをローカル変数にアサイン
    var x = this.x;
    // Promiseのインスタンスを生成する
    var p = new Promise<string>(function(resolve, reject) {
      // 1秒待機したのちただちにresolve(string)を呼び出す
      setTimeout(() => resolve(x), 1000);
    });
    // Promise初期化直後のログ出力
    console.log("#1 in greetAsync().");
    // Promiseが表わす処理が終わったあと実行させたい処理を設定
    p.then((d : string) => {
      // 非同期的にあいさつを出力
      console.log(d + ' async');
    });
    // 事後処理設定の直後のログ出力
    console.log("#2 in greetAsync().");
    // Promiseが表わす処理の完了を待機する
    await p;
    // Promiseが表わす処理の完了後のログ出力
    console.log("#3 in greetAsync().");
    // Promiseを呼び出し元に返す
    return p;
  }
}

// あいさつクラスのインスタンスを取得
var g = new Greeter('bonjour');
// 同期メソッドを呼び出す前のログ出力
console.log("#1 in global.");
// 同期メソッドを呼び出す
g.greet();
// 同期メソッドを呼び出した後/非同期メソッドを呼び出す前のログ出力
console.log("#2 in global.");
// 非同期メソッドを呼び出す
g.greetAsync();
// 非同期メソッドを呼び出した後のログ出力
console.log("#3 in global.");
