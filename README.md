# 認証最小サンプル

React（SPA）でのログイン最小機能  

・index.js: クライアントサイドの処理(トップページ、登録ページ、ログインページ)  
・server.js: サーバの処理  

トランスパイルには簡易のため、parcelを使用しています。(ES6の機能、Reactの変換のため)  
動作確認：Chrome  

# 起動方法

```
# 依存パッケージインストール
& yarn
# デバッグ起動
$ yarn dev
```

# クライアントサイド解説
ユーザのログイン後の情報（id, token）はブラウザのlocalStorageに保存します。  
Chrome DevToolsのApplication -> localStorageから中身を確認できます。  

```
// ブラウザのlocalStorage領域からtoken情報を取得するよ
// localStorageはどこからでも参照できるよ
function getUser() {
  return localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : {}
}
```

ページの出し分けはAppクラスにてreact-routerで行っています。  

```
class App extends React.Component {

  constructor(props) {
    super(props)
    this.state = {}
  }

  render () {
    return (
      <BrowserRouter>
        {/* react-routerでページの出し分けを行うよ */}
        <Switch>
          <AppRoute exact path='/' component={TopPage} />
          <AppRoute exact path='/signup' component={SignupPage} />
          <AppRoute exact path='/login' component={LoginPage} />
          <AppRoute exact path='/user' component={UserPage} needLogin />
          <AppRoute component={NotFound}/>
        </Switch>
      </BrowserRouter>
    )
  }
}
```

needLoginが付いているパスに関しては、未ログインの場合、loginページにリダイレクトしています。  

```
const AppRoute = (({component: Component, needLogin}) => {

  // ブラウザのlocalStorage領域からuser情報を取得するよ
  const user = getUser()
  // ログインが必要なページはログインページに飛ばすよ
  if (needLogin && Object.keys(user).length === 0) {
    return <Redirect to={{pathname: '/login'}} />
  }

  return <Route render={props => <Component {...props} />} />
})
```

TopPageはログイン状態かそうでないかで表示を切り替えています。  

```
    return (
      <div>
        {Object.keys(user).length === 0 ? 
          <div>
            <Link style={styles.link} to='/signup'>ユーザ登録</Link>
            <Link style={styles.link} to='/login'>ログイン</Link>
          </div>
          : 
          <div>
            <Link style={styles.link} to='/user'>ユーザページへ</Link>
            <button onClick={this.logout}>ログアウト</button>
          </div>
        }
      </div>
    )
```

登録の処理はSignupPageのcreateUserで行っています。  
登録が成功するとlocalStorageのuserにid,tokenを保存します。  

```
  createUser(e) {
    e.preventDefault() // formのsubmit処理そのものを無効化するよ（ブラウザがリロードされてしまうので）
    const data = new FormData(e.target)
    // name属性が指定されたinputタグから値を取得するよ
    const name = data.get('name')
    const email = data.get('email')
    const password = data.get('password')
    // user作成のAPIを呼ぶよ
    fetch('/api/users', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({name, email, password}),
    })
    .then((response) => {
      if (!response.ok) throw response
      return response.json()
    })
    .then(user => {
      // ユーザのidとトークンをブラウザに保存するよ
      localStorage.setItem('user', JSON.stringify(user))
      // トップページに遷移するよ
      this.props.history.push('/')
    })
    .catch((e) => {
      e.json().then((e) => {
        this.setState({error: e.message})
      })
    })
  }
```

UserPageでは認証付きのAPIをコールしてユーザの情報を取得します。  
AuthorizationヘッダーにBearerという形式でtokenを付与してリクエストします。  

```
  componentDidMount() {
    const user = getUser()
    if (user.id && user.token) {
      fetch(`/api/users/${user.id}`, {
        method: 'GET',
        headers: {'Authorization': `Bearer ${user.token}`},
      })
      .then((response) => {
        if (!response.ok) throw response
        return response.json()
      })
      .then(user => this.setState({user}))
      .finally(() => this.setState({loading: false}))
    } else {
      this.setState({loading: false})
    }
  }
```

# サーバ側の処理
認証の処理は、passport, jsonwebtokenで行っています。  
また、生のままパスワードをデータベースに保存するのはデータベースをまるごと盗まれた場合にやばいので  
ハッシュ化して保存しておきます。  
認証時に生のパスワード取得後、ハッシュ化してデータベースに保存されているハッシュと照合します。  

```
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
```

認証なしのAPIと認証ありのAPIのパス（ルーティング）を定義します。  
認証ありのAPIは先程passportで定義したauthenticateを指定します。  
この例だと、認証が成功した場合に、show関数が呼ばれます。(それ以外は401エラーが返る)  

```
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
```


# リリースビルド
次のコマンドでリリースビルドが出来ます。  
(source mapを削除してminifyしてます。)  

```
$ yarn prod
```