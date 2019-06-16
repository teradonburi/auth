// APIのルーティングとかミドルウェアの組み込みが楽だからexpressフレームワークを使うよ
const express = require('express')
const app = express()

// ユーザのユニークID生成用
const uuidv4 = require('uuid/v4')
// ユーザの情報を保存するデータベース
// 今回は簡易のためjsonファイルに保存するよ
// 実運用するときはMySQLやmongoDBなどちゃんとしたデータベースに保存した方が良い
const low = require('lowdb')
const FileSync = require('lowdb/adapters/FileSync')
const adapter = new FileSync('db.json') // 保存するファイル
const db = low(adapter)

// データベースに入れる初期データ
db.defaults({users: []})
  .write()

// サーバーでエラーが起きたらここに到達してエラーログが出ます
process.on('uncaughtException', (err) => console.error(err))
process.on('unhandledRejection', (err) => console.error(err))

// POSTメソッドのbodyを受け取れるようにするための前準備の処理
const bodyParser = require('body-parser')
app.use(bodyParser.urlencoded({extended: true}))
app.use(bodyParser.json())

// サーバがホスティングするフォルダ
// サーバ上でindex.htmlが見れるようにするよ
app.use(express.static('dist'))

// Json WebToken(JWT)生成(改ざん不能なトークン)
// https://qiita.com/kaiinui/items/21ec7cc8a1130a1a103a
const jwt = require('jsonwebtoken')
const jwtKey='secret' // 暗号化用キー（バレちゃいけないやつ）

// ハッシュ生成用
const crypto = require("crypto")


// 認証処理の前処理だよ
const passport = require('passport')
const BearerStrategy = require('passport-http-bearer')
const authenticate = passport.authenticate('bearer', {session: false})
passport.use(new BearerStrategy(function(token, done) {
  // 認証APIの場合はここを通るよ
  jwt.verify(token, jwtKey, function(err, decoded) {
    if (err) return done(null, false) // 不正なトークン

    const sha512 = crypto.createHash('sha512')
    sha512.update(decoded)
    const hash = sha512.digest('hex')

    const user = db.get('users')
      .find({ password: hash })
      .value()
  
    if (!user) return done(null, false) // パスワードがユーザのものと一致しない
    return done(null, user) // 認証OK
  })
}))

// ユーザ作成
async function create(req, res) {
  // POSTメソッドのパラメータはbodyに渡ってきます。
  const name = req.body.name
  const email = req.body.email
  const password = req.body.password

  const user = db.get('users')
    .find({ email })
    .value()

  if (user) {
    return res.status(400).json({message: 'すでにそのメールアドレスは使われています'})
  }

  // passwordはデータベースに直接保存するのでなくハッシュ化する
  // 生のパスワードを保存しておくと、データベースをまるごと盗まれたらやばい
  const sha512 = crypto.createHash('sha512')
  sha512.update(password)
  const hash = sha512.digest('hex')

  // user作成
  const id = uuidv4()
  db.get('users')
    .push({id, name, email, password: hash}) 
    .write()
  
  // JWT作成（認証用）
  const token = jwt.sign(password, jwtKey)
  res.json({id, token})
}

// ログイン
async function login(req, res) {

  const email = req.body.email
  const password = req.body.password

  const sha512 = crypto.createHash('sha512')
  sha512.update(password)
  const hash = sha512.digest('hex')

  const user = db.get('users')
    .find({ email, password: hash })
    .value()

  if (!user) {
    return res.status(400).json({message: 'メールアドレスか、パスワードが間違っています'})
  }

  const token = jwt.sign(password, jwtKey)
  res.json({id: user.id, token})
}

// ユーザの取得
async function show(req, res) {
  // :idの部分にユーザのidが渡ってきます。(req.params.idで参照)
  const user = db.get('users')
    .find({ id: req.params.id })
    .value()
  if (user === null) return res.status(404).json({message: 'not found'})
  res.json(user)
}

// 認証なしのAPI
app.use(
  '/api',
  express.Router()
    // ユーザの作成
    .post('/users', create) // POSTメソッド
    .post('/login', login)
)

// 認証ありのAPI
app.use(
  '/api',
  authenticate, // 認証処理
  express.Router()
    // ログイン済みユーザの取得
    .get('/users/:id', show)
)

// 開発用の設定だよ
if (process.env.NODE_ENV === 'dev') {
  const Bundler = require('parcel-bundler')
  const bundler = new Bundler('index.html')
  // index.htmlが使っているモジュールが変更されたらクライアント側を再ビルドするよ
  app.use(bundler.middleware())  
}

// サーバを5000番ポートで起動するよ
app.listen(5000, () => {
  console.log('ブラウザでhttp://localhost:5000にアクセスしてください')
})