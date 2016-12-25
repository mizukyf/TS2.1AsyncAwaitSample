# TS2.1AsyncAwaitSample

TypeScript v2.1を使用してWebアプリケーション開発を行うための雛形プロジェクトです。`npm`と`gulp`コマンドが実行できる環境さえあれば、TypeScript v2.1のコードを使った開発を始められます。

このプロジェクトはTypeScriptの同バージョンで導入された _"Downlevel Async Functions"_ の機能を利用してみようという単純な動機のもとで作成されました。とはいえ、開発者の好みの問題として、Visual StudioやWebStormのようなIDEへの非依存とMavenとの共存も外せない条件でしたので、最終的に以下のような要件もしくは制限事項のもと作成されることになりました：

* [TypeScript v2.1](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-1.html)の _"Downlevel Async Functions"_ を利用できる
* TypeScriptコーディングにはIDEを使わず[Atom](https://atom.io/)や[VS Code](https://code.visualstudio.com/)のみを使用する
* Atomと[Gulp](http://gulpjs.com/)で同じ`tscondfig.json`を使用させる
* Atomだけでも最低限TypeScriptのトランスパイルを行えるようにする
* Atomによるコード編集とビルドには[atom-typescript](https://atom.io/packages/atom-typescript)パッケージを使う
* ES3（ECMAScript第3版）をビルド・ターゲットとする
* ES6（ES2015。ECMAScript第6版）のPromise/A+を[ポリフィル](https://github.com/stefanpenner/es6-promise)により導入する
* [Browserify](http://browserify.org/)によりバンドル（実行時依存性の自動的・静的解決）を行う
* [Maven](https://maven.apache.org/)との共存を前提としたディレクトリ構成をとる
* 開発者は`main.ts`もしくはそこからインポートされる`*.ts`ファイルのみコーディングする
* 画面側はトランスパイルおよびバンドルの成果物`app.min.js`ファイルをロードする

## 使い方

### ビルドする

クローン直後の場合はまず`npm install`コマンドを実行して`node_modules/`配下に外部モジュールをダウンロードします。

`gulp`もしくは`gulp build`コマンドを実行するとビルド（トランスパイルとバンドル）が行われます。ビルドの処理内容については「タスク」のセクションを参照してください。

_NOTE:_ この雛形プロジェクトではMavenとの共存を前提としています。ビルド実行時`target/classes`ディレクトリが存在する場合、このディレクトリ配下に`src/main/resources`ディレクトリ配下のファイルがそのディレクトリ構造を保ったままコピーされます。

### コーディングする

`main.ts`もしくはそこからインポートする`*.ts`ファイルを作成してプログラムを記述します。`gulp watch`コマンドを起動した状態で`*.ts`ファイルを更新するとファイル保存の都度、自動でビルドが行われます。

_NOTE:_ この雛形プロジェクトでは`*.js`ファイルを開発者が直接作成・変更することは想定していません。またエントリーポイントである`main.ts`から直接もしくは間接に参照されない`*.ts`ファイルはビルドの最終成果物に含まれません。

### テストする

`*.spec.ts`ファイルを作成してテストコードを記述します。そして`gulp test`コマンドを実行するとJasmineテストランナーによりテストが実行されます。

_NOTE:_ テスト実行に際しては、`*.ts`ファイルはトランスパイルのみ行われ、バンドルは行われません。したがって、`*.spec.ts`ファイルからテスト対象のモジュールの`*.ts`ファイルをインポートする場合は、単に`import {TargetClass} from '../../../main/resources/js/TargetFile';`というように記述してください。

## ディレクトリ構成

この雛形プロジェクトのディレクトリ構成は以下のとおりです。Mavenとの共存を前提とするため、Nodeパッケージとしてはかなり冗長な構成となっています：

```
├── gulpfile.js   ← Gulpのタスク定義ファイル
├── node_modules  ← npmにより管理されている外部モジュールのファイル
│   ├── @types    ← TypeScriptの型定義（*.d.ts。アンビエント）モジュール
│   │   └── ...     （例えばjQueryの型定義ファイルなど）
│   └── ...       ← その他のモジュール（例えばjQueryの本体モジュールなど）
├── package.json  ← npmのパッケージ定義ファイル（実際上依存性の宣言にのみ使用）
├── src           ← Mavenのディレクトリ構造
│   ├── main
│   │   └── resources
│   │       ├── index.html          ← app.min.jsをロードするWebページ
│   │       └── js
│   │           ├── app.min.js      ← Browserifyにより生成されたバンドル
│   │           ├── app.min.js.map  ← Browserifyにより生成されたソースマップ
│   │           ├── main.ts         ← エントリーポイントのtsファイル
│   │           └── sub.ts          ← エントリーポイントから参照されているtsファイル
│   └── test
│       └── resources
│           └── js
│               └── main.spec.ts    ← トランスパイル後Jasmineにロードされるtsファイル
├── target        ← Mavenのディレクトリ構造
│   ├── classes   ← src/main/resourcesの内容がコピーされるディレクトリ
│   └── test-classes
└── tsconfig.json ← TypeScriptのトランスパイル設定ファイル
```

## タスク

この雛形プロジェクトではビルドのタスク実行にGulpを使用しています。定義されているタスクは以下の4つで、デフォルトは`build`タスクです。

### build (default)

`main.ts`をエントリーポイントとして`*.ts`ファイルのトランスパイル（TypeScriptからJavaScriptへのコンパイル）とバンドル（インポートされている内外のモジュールの内容を1ファイルに集約する）を行います。もし`target/`配下のディレクトリが存在すれば、バンドル後のファイルを含むリソース一式をそこにコピーします。

### clean

`src/`配下の`*.js`と`*.map`を削除します。Mavenと共存させる前提のため`target/`に対しては何も手出しをしません。

### test

`*.ts`ファイルのトランスパイルを行った後、`*.spec.ts`ファイルをトランスパイルし、その結果をJasmineに渡してテストを実行します。`build`の場合と異なり、`*.ts`ファイルはトランスパイルのみ行われ、バンドルは行われません。

### watch

buildタスクに相当する処理を実行した後、ファイルの変更監視を開始します。`*.ts`ファイルが変更された場合はトランスパイルとバンドルを実行したあと`target/`へのコピーを行います。その他ファイルが変更された場合は`target/`へのコピーのみ行います。
