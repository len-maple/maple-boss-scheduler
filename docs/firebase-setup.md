# Firebase Firestore セットアップ手順書（人間の手作業用）

このドキュメントは [implementation-plan.md](./implementation-plan.md) の技術スタック（§4）に基づき、
Firebaseを一度も使ったことがない人向けに、**Firebaseコンソール上でのマウス操作**を
1つずつ記載した手順書です。Claude Code（AI）ではなく、人がブラウザで実施する作業を想定しています。

前提: Googleアカウントを持っていること

## 認証方式についての前提

実装計画の§8「未決定事項」でメンバー識別方法が未確定でしたが、本手順書では
**匿名認証（Anonymous Authentication）** を採用します。ログイン画面や名前・パスワード入力なしに、
ブラウザごとに一意なID（`uid`）を自動で割り当てられる仕組みで、Firestoreのセキュリティルールで
「本人だけが自分のデータを書き込める」という最低限の制御に使います。
（この方針を変えたい場合は先にimplementation-plan.mdの方針を相談してください）

---

## 1. Firebaseプロジェクトの作成

1. https://console.firebase.google.com/ にアクセスし、Googleアカウントでログインする
2. 「プロジェクトを作成」をクリック
3. プロジェクト名を入力する（例: `maplestory-boss-scheduler`）→「続行」
4. Google アナリティクスの設定画面が出るが、本ツールでは不要なので
   「このプロジェクトで Google アナリティクスを有効にする」のチェックを**外して**「プロジェクトを作成」
5. 作成が完了したら「続行」をクリックし、プロジェクトのダッシュボードに入る

## 2. Webアプリの登録

1. プロジェクトのダッシュボード中央にある `</>`（Web）アイコンをクリック
2. アプリのニックネームを入力する（例: `boss-scheduler-web`）
3. 「Firebase Hosting も設定する」のチェックは**外す**（GitHub Pagesを使うため不要）
4. 「アプリを登録」をクリック
5. 画面に表示される `firebaseConfig` オブジェクトの値（`apiKey`, `authDomain`, `projectId`,
   `storageBucket`, `messagingSenderId`, `appId`）を**メモ帳などに控えておく**（§6で使用）
6. 「コンソールに進む」をクリックして完了

## 3. Firestore Database の有効化

※Firebaseコンソールの画面は時期によって変わることがあります。「データベースの作成」ボタンが見当たらず、
代わりに **Realtime Database** と **Firestore** のどちらを使うか選ぶ画面が出た場合は、
**必ず「Firestore」（Cloud Firestore）を選択してください**。Realtime Databaseは今回の設計では使いません。

1. 左メニューの「構築」→「Firestore Database」（または上記の「Database」選択画面）をクリックし、Firestoreを選ぶ
2. 「データベースの作成」（またはFirestore側のセットアップ開始ボタン）をクリック
3. ロケーションを選択する（例: `asia-northeast1`＝東京）→「次へ」
   - **作成後にロケーションは変更できない**ので注意
4. セキュリティルールのモードは「本番環境モード」を選択（§5で自前のルールに置き換えるためどちらでも良いが、安全のためこちらを推奨）
5. 「有効にする」をクリックし、作成完了まで待つ

## 4. Authentication（匿名認証）の有効化

1. 左メニューの「構築」→「Authentication」をクリック
2. 「始める」をクリック
3. 「Sign-in method」タブのプロバイダ一覧から「匿名」を選択
4. 右上のトグルを ON にして「保存」

## 5. Firestore セキュリティルールの設定

1. 「構築」→「Firestore Database」→上部タブの「ルール」を開く
2. エディタの内容を、以下の内容に**全て置き換える**

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /schedules/{scheduleId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow update: if request.auth != null
                    && request.auth.uid == resource.data.leaderId;

      match /responses/{memberId} {
        allow read: if true;
        allow write: if request.auth != null
                     && request.auth.uid == memberId;
      }
    }
  }
}
```

3. 「公開」ボタンをクリックして反映する

**ルールの意味:**
- `schedules`: 誰でも閲覧可（共有URLでアクセスするため） / 作成は匿名認証済みなら誰でも可 /
  更新（開催日時の確定など）はスケジュール作成時の`leaderId`と一致する本人のみ
- `responses`（メンバーの回答）: 誰でも閲覧可 / 書き込みは自分の`uid`と一致するドキュメントのみ
  （他人の回答を書き換えられないようにする）

## 6. アプリ側の環境変数設定（.env）

1. プロジェクトのルートフォルダに `.env.local` というファイルを新規作成する
2. §2でメモした値を使い、以下の形式で記入する（値は実際にコンソールに表示されたものに置き換える）

```
VITE_FIREBASE_API_KEY=xxxxxxxxxxxxxxxx
VITE_FIREBASE_AUTH_DOMAIN=xxxxxxxxxxxxxxxx.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=xxxxxxxxxxxxxxxx
VITE_FIREBASE_STORAGE_BUCKET=xxxxxxxxxxxxxxxx.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=xxxxxxxxxxxxxxxx
VITE_FIREBASE_APP_ID=xxxxxxxxxxxxxxxx
```

3. `.env.local` は**Gitにコミットしない**（`.gitignore`に登録済みであることを確認する。
   まだであればClaude Codeに依頼して追加してもらう）

## 7. GitHub Pages公開用のGitHub Secrets登録

GitHub Actionsでビルドしてデプロイする際に、上記の値をSecretsとして使えるように登録する。

1. GitHubのリポジトリページを開き、「Settings」→左メニュー「Secrets and variables」→「Actions」を開く
2. 「New repository secret」を押し、以下の6つを**1つずつ**登録する（Name/Valueとも§6と同じ内容）
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`

補足: Firebase WebアプリのconfigはAPIキー漏洩そのものよりも§5のセキュリティルールで
アクセス制御するのが正しい設計だが、リポジトリに直接値を書かないためSecrets経由でビルド時に注入する。

## 8. 動作確認方法

1. ローカルで `npm run dev` を実行してアプリを起動する
2. ブラウザの開発者ツール → Networkタブで `firestore.googleapis.com` 宛のリクエストが
   エラーにならず通っていることを確認する
3. Firebaseコンソールの「Firestore Database」→「データ」タブを開き、
   アプリから作成したスケジュールのドキュメントが実際に反映されているか確認する
4. Authenticationの「Users」タブを開き、匿名ユーザーのUIDが1件以上登録されているか確認する

## 9. 補足: 無料枠について

FirestoreのSparkプラン（無料枠）は概ね日次で読み取り5万回・書き込み2万回程度（変動あり、
最新の数値は[Firebase公式の料金ページ](https://firebase.google.com/pricing)を確認）。
身内でのボススケジュール調整という利用規模であれば十分無料枠内に収まる想定。
