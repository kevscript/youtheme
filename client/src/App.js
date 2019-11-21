import React, { useState } from 'react'
import { BrowserRouter as Router, Route, Redirect } from 'react-router-dom'
import { useMutation } from '@apollo/react-hooks'
import gql from 'graphql-tag'

import { API_KEY } from './config'

import GlobalStyle from './styles/global'
import PrivateRoute from './PrivateRoute'
import LoginPage from './pages/LoginPage'
import MainPage from './pages/MainPage'
import EditPage from './pages/EditPage'
import FeedPage from './pages/FeedPage'
import SubsPage from './pages/SubsPage'

const REGISTER_USER = gql`
  mutation RegisterUser($idToken: String!, $accessToken: String!) {
    register(idToken: $idToken, accessToken: $accessToken) {
      name
      email
      id
      createdAt
      subscriptions {
        kind
        etag
        id
        snippet {
          publishedAt
          title
          description
          channelId
          resourceId {
            kind
            channelId
          }
          thumbnails {
            default {
              url
            }
            medium {
              url
            }
            high {
              url
            }
          }
        }
        contentDetails {
          totalItemCount
          newItemCount
          activityType
        }
      }
      themes {
        name
        id
      }
    }
  }
`

const RELOAD_SUBS = gql`
  mutation ReloadSubs($id: String!, $accessToken: String!) {
    reloadSubs(id: $id, accessToken: $accessToken) {
      kind
      etag
      id
      snippet {
        publishedAt
        title
        description
        channelId
        resourceId {
          kind
          channelId
        }
        thumbnails {
          default {
            url
          }
          medium {
            url
          }
          high {
            url
          }
        }
      }
      contentDetails {
        totalItemCount
        newItemCount
        activityType
      }
    }
  }
`

const App = () => {
  const [googleUser, setGoogleUser] = useState(null)
  const [authUser, setAuthUser] = useState(null)
  const [subscriptions, setSubscriptions] = useState([])
  const [themes, setThemes] = useState([])

  const [register] = useMutation(REGISTER_USER, {
    onCompleted: (data) => {
      setAuthUser({
        name: data.register.name,
        email: data.register.email,
        id: data.register.id,
        createdAt: data.register.createdAt
      })
      setSubscriptions(data.register.subscriptions)
      setThemes(data.register.themes)

    }
  })

  const [reloadSubs] = useMutation(RELOAD_SUBS, {
    variables: { 
      id: authUser? authUser.id : null, 
      accessToken: googleUser ? googleUser.accessToken : null 
    },
    onCompleted: (data) => setSubscriptions(data.reloadSubs)
  })

  const handleLogout = () => {
    setGoogleUser(null)
    setAuthUser(null)
    setSubscriptions([])
    setThemes([])
  }

  const getSubscriptions = async () => {
    await fetchAllSubscriptions(null)
  }

  const fetchAllSubscriptions = (token) => {
    const baseUrl = `https://www.googleapis.com/youtube/v3/subscriptions?part=snippet%2CcontentDetails&maxResults=50&mine=true&key=${API_KEY}`
    const headers = {
      'Authorization': 'Bearer ' + googleUser.Zi.access_token,
      'Accept': 'application/json'
    }
    const fetchUrl = token ? `${baseUrl}&pageToken=${token}` : baseUrl

    return fetch(fetchUrl, { headers: headers })
      .then(res => res.json())
      .then(data => {
        if (data.items && data.items.length > 0) {
          if (!data.nextPageToken) {
            setSubscriptions(subs => [...subs, ...data.items].sort((a, b) => {
              return a.snippet.title.toLowerCase() > b.snippet.title.toLowerCase() ? 1 : -1
            }))
            console.log('all subscriptions have been fetched')
          } else {
            setSubscriptions(subs => [...subs, ...data.items].sort((a, b) => {
              return a.snippet.title.toLowerCase() > b.snippet.title.toLowerCase() ? 1 : -1
            }))
            fetchAllSubscriptions(data.nextPageToken)
          }
        } else {
          console.log('this account is not subscribed to any youtube channel')
        }
      })
      .catch(err => console.error(err))
  }

  return (
    <div>
      <GlobalStyle />
      <Router>
        <Route exact path="/login">
          {
            authUser 
              ? <Redirect to='/' /> 
              : <LoginPage 
                  handleGoogleUser={setGoogleUser} 
                  googleUser={googleUser} 
                  authUser={authUser} 
                  handleAuthUser={register} 
                />
          }
        </Route>
        <PrivateRoute 
          exact path="/" 
          user={authUser} 
          component={() => <MainPage handleLogout={handleLogout} />} 
        />
        <PrivateRoute exact path="/edit" user={authUser} component={EditPage}/>
        <PrivateRoute exact path="/feed" user={authUser} component={FeedPage} />
        <PrivateRoute 
          exact path="/subscriptions" 
          user={authUser} 
          component={() => <SubsPage subscriptions={subscriptions} handleReload={reloadSubs} />} 
        />
      </Router>
    </div>
  )
}

export default App