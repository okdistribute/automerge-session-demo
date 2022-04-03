import React from 'react'
import { Route, useLocation } from 'wouter'
import Documents from './Documents'
import DraftView from './components/DraftView'
import withDocument from './components/withDocument'
import { nanoid } from 'nanoid'
require('setimmediate')

let documents = Documents()

export default function App() {
  let [, setLocation] = useLocation()

  async function newUpwell() {
    let id = nanoid()
    let doc = await documents.create(id, documents.author)
    setLocation('/' + doc.id + '/' + doc.drafts()[0].id)
  }

  return (
    <>
      <Route path="/:id/:did">
        {(params) => {
          let props = {
            author: documents.author,
            ...params,
          }

          let Component = withDocument(DraftView, props)
          return <Component />
        }}
      </Route>
      <Route path="/">
        {() => {
          return (
            <div>
              <button onClick={newUpwell}>New Document</button>
            </div>
          )
        }}
      </Route>
    </>
  )
}
