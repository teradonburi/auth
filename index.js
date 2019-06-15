// parcelが色々解釈してくれて、importとかreactが使えるようになるよ
import React from 'react'
import ReactDOM from 'react-dom'
import { BrowserRouter, Route, Link } from 'react-router-dom'

// ブラウザのlocalStorage領域からtoken情報を取得するよ
function getUser() {
  return localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : {}
}

class TopPage extends React.Component {

  constructor(props) {
    super(props)
    this.state = {loading: true, user: null}
    // logoutメソッドの中でthisを使えるようにするよ
    this.logout = this.logout.bind(this)
  }

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

  logout() {
    delete localStorage.user
    this.setState({user: null})
  }

  render() {
    const { loading, user } = this.state

    if (loading) return <div>ローディング中・・・</div>

    return (
      <div>
        {!user ? 
          <div>
            <Link style={{display: 'block'}} to='/signup'>ユーザ登録</Link>
            <Link style={{display: 'block'}} to='/login'>ログイン</Link>
          </div>
          : 
          <div>
            <div>ようこそ{user.name}さん</div>
            <button onClick={this.logout}>ログアウト</button>
          </div>
        }
      </div>
    )
  }
}

class SignupPage extends React.Component {

  constructor(props) {
    super(props)
    this.state = { error : null }
    // createUserメソッドの中でthisを使えるようにするよ
    this.createUser = this.createUser.bind(this)
  }

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

  render() {
    const { error } = this.state

    const styles = {
      input: {
        display: 'block',
      },
      error: {
        color: 'red',
      }
    }

    // ブラウザのlocalStorage領域からtoken情報を取得するよ
    const user = getUser()
    if (Object.keys(user).length > 0) {
      // もうログイン済みなのでトップページに遷移するよ
      return this.props.history.push('/')
    }

    return (
      <form action='url' onSubmit={this.createUser} acceptCharset='UTF-8' >
        <input name='name' required style={styles.input} placeholder='名前' type='text' />
        <input name='email' required style={styles.input} placeholder='メールアドレス' type='email' />
        <input name='password' required minLength='8' style={styles.input} placeholder='パスワード' type='password' autoComplete='suggest' />
        <input type='submit' value='登録' />
        <div style={styles.error}>{error}</div>
      </form>
    )
  }
}

class LoginPage extends React.Component {

  constructor(props) {
    super(props)
    this.state = { error : null }
    // loginメソッドの中でthisを使えるようにするよ
    this.login = this.login.bind(this)
  }

  login(e) {
    e.preventDefault() // formのsubmit処理そのものを無効化するよ（ブラウザがリロードされてしまうので）
    const data = new FormData(e.target)
    // name属性が指定されたinputタグから値を取得するよ
    const email = data.get('email')
    const password = data.get('password')
    // user作成のAPIを呼ぶよ
    fetch('/api/login', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({email, password}),
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

  render() {
    const { error } = this.state

    const styles = {
      input: {
        display: 'block',
      },
      error: {
        color: 'red',
      }
    }

    // ブラウザのlocalStorage領域からtoken情報を取得するよ
    const user = getUser()
    if (Object.keys(user).length > 0) {
      // もうログイン済みなのでトップページに遷移するよ
      return this.props.history.push('/')
    }

    return (
      <form action='url' onSubmit={this.login} acceptCharset='UTF-8' >
        <input name='email' required style={styles.input} placeholder='メールアドレス' type='email' />
        <input name='password' required minLength='8' style={styles.input} placeholder='パスワード' type='password' autoComplete='suggest' />
        <input type='submit' value='ログイン' />
        <div style={styles.error}>{error}</div>
      </form>
    )
  }
}

class App extends React.Component {

  constructor(props) {
    super(props)
    this.state = {}
  }

  render () {
    return (
      <BrowserRouter>
        {/* react-routerでページの出し分けを行うよ */}
        <Route exact path='/' component={TopPage} />
        <Route exact path='/signup' component={SignupPage} />
        <Route exact path='/login' component={LoginPage} />
      </BrowserRouter>
    )
  }
}

// index.htmlのid=rootのdivタグ以下にAppコンポーネント描画を描画するよ
ReactDOM.render(
  <App />,
  document.getElementById('root')
)
