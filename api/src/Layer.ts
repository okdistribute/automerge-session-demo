import { nanoid } from 'nanoid';
import init from 'automerge-wasm-pack'
import { Automerge, loadDoc, create, Value }  from 'automerge-wasm-pack';
import { Author } from './Upwell';
import * as Diff from 'diff';

export async function loadForTheFirstTimeLoL() {
  return new Promise<void>((resolve, reject) => {
    init().then(() => {
      resolve()
    })
  })
}

const ROOT = '_root'

export type ChangeMetadata = {
  message: string,
  author: Author
}

export type Heads = string[];
export type LayerMetadata = {
  id: string,
  shared: boolean,
  parent_id: string,
  author: Author,
  message: string,
  archived: boolean
}

export type Edit = {
  type: 'insert' | 'delete' | 'retain',
  start: number,
  value: string
}
export type Subscriber = (doc: Layer, heads: Heads) => void 

export class LazyLayer {
  binary: Buffer
  id: string
  constructor(id: string, binary: Buffer) {
    this.binary = binary
    this.id = id 
  }

  hydrate() {
    return new Layer(this.id, loadDoc(this.binary))
  }
}

export class Layer {
  id: string
  doc: Automerge
  private subscriber?: Subscriber 

  constructor(id: string, doc: Automerge) {
    this.id = id
    this.doc = doc
  }

  private _getAutomergeText(prop: string): string {
    let value = this.doc.value(ROOT, prop)
    if (value && value[0] === 'text') return this.doc.text(value[1])
    else return ''
  }

  private _getValue(prop: string) {
    let value = this.doc.value(ROOT, prop)
    if (value && value[0]) return value[1]
  }

  get shared () {
    return this._getValue('shared') as boolean;
  }

  set shared (value: boolean) {
    this.doc.set(ROOT, 'shared', value)
  }

  get version () {
    return this._getValue('version') as string;
  }

  set version (value: string) {
    this.doc.set(ROOT, 'version', value)
  }

  get time(): number {
    return this._getValue('time') as number
  }

  set time(value: number){
    this.doc.set(ROOT, 'time', value) 
  }

  get message (): string {
    return this._getValue('message') as string;
  }

  set message(value: string) {
    this.doc.set(ROOT, 'message', value)
  }

  get text (): string {
    return this._getAutomergeText('text')
  }

  get author(): Author {
    return this._getValue('author') as Author
  }

  get title (): string {
    return this._getAutomergeText('title')
  }

  get parent_id(): string {
    return this._getValue('parent_id') as string
  }

  get archived(): boolean {
    return this._getValue('archived') as boolean
  }

  set archived(value: boolean) {
    this.doc.set(ROOT, 'archived', value)
  }

  get metadata() : LayerMetadata {
    return {
      id: this.id,
      message: this.message,
      author: this.author,
      parent_id: this.parent_id,
      archived: this.archived,
      shared: this.shared
    }
  }

  subscribe(subscriber: Subscriber) {
    this.subscriber = subscriber
  }

  insertAt(position: number, value: string | Array<string>, prop = 'text') {
    let obj = this.doc.value(ROOT, prop)
    if (obj && obj[0] === 'text') return this.doc.splice(obj[1], position, 0, value)
    else throw new Error('Text field not properly initialized')
  }

  deleteAt(position: number, count: number = 1, prop = 'text') {
    let obj = this.doc.value(ROOT, prop)
    if (obj && obj[0] === 'text') return this.doc.splice(obj[1], position, count, '')
    else throw new Error('Text field not properly initialized')
  }

  mark(name: string, range: string, value: Value, prop = 'text') {
    let obj = this.doc.value(ROOT, prop)
    if (obj && obj[0] === 'text') return this.doc.mark(obj[1], range, name, value)
    else throw new Error('Text field not properly initialized')
  }

  getMarks(prop = 'text') {
    let obj = this.doc.value(ROOT, 'text')
    if (obj && obj[0] === 'text') return this.doc.raw_spans(obj[1])
    else throw new Error('Text field not properly initialized')
  }

  get marks () {
    return this.getMarks()
  }

  save (): Uint8Array {
    return this.doc.save()
  }

  fork(message: string, author: Author): Layer {
    let id = nanoid()
    let doc = this.doc.fork()
    doc.set(ROOT, 'message', message)
    doc.set(ROOT, 'author', author)
    doc.set(ROOT, 'shared', false)
    doc.set(ROOT, 'time', Date.now())
    doc.set(ROOT, 'archived', false)
    doc.set(ROOT, 'parent_id', this.id)
    return new Layer(id, doc)
  }

  merge(theirs: Layer) {
    this.doc.merge(theirs.doc)
  }

  static mergeWithEdits(ours: Layer, ...theirs: Layer[]) {
    // Fork the comparison layer, because we want to create a copy, not modify
    // the original. It might make sense to remove this from here and force the
    // caller to do the fork if this is the behaviour they want in order to
    // parallel Layer.merge() behaviour.
    let newLayer = ours.fork('Merge', ours.author)
    let origHead = newLayer.doc.getHeads()

    // Merge all the passed-in layers to this one.
    theirs.forEach(layer => newLayer.merge(layer))

    // Now do a blame against the heads of the comparison layers.
    let heads = theirs.map(layer => layer.doc.getHeads())

    let obj = newLayer.doc.value(ROOT, 'text')
    if (!obj || obj[0] !== 'text') throw new Error('Text field not properly initialized')

    let blame = newLayer.doc.blame(obj[1], origHead, heads)

    // blame contains an array with an entry for each layer passed in above,
    // with edits (add, del) applied against newLayer's text. Convert those to marks!

    for (let i = 0; i < blame.length; i++) {
      let layer = theirs[i]
      let edits = blame[i]

      edits.add.forEach(edit => {
        let text = newLayer.text.substring(edit.start, edit.end)
        newLayer.mark(
          'insert',
          `(${edit.start}..${edit.end})`,
          JSON.stringify({
            author: layer.author,
            text
          })
        )
      })

      edits.del.forEach(edit => {
        newLayer.mark(
          'delete',
          `(${edit.pos}..${edit.pos})`,
          JSON.stringify({
            author: layer.author,
            text: edit.val
          })
        )
      })
    }

    newLayer.commit('Merge')

    return newLayer
  }

  static load(id: string, binary: Uint8Array): Layer {
    let doc = loadDoc(binary)
    let layer = new Layer(id, doc)
    return layer
  }

  static create(message: string, author: Author): Layer {
    let doc = create()
    let id = nanoid()
    doc.set(ROOT, 'message', message)
    doc.set(ROOT, 'author', author)
    doc.set(ROOT, 'shared', false, 'boolean')
    doc.set(ROOT, 'time', Date.now(), 'timestamp')
    doc.set(ROOT, 'archived', false, 'boolean')
    doc.make(ROOT, 'title', '')
    doc.make(ROOT, 'text', '')
    return new Layer(id, doc)
  }

  commit(message: string): Heads {
    let meta: ChangeMetadata = { author: this.author, message }
    let heads = this.doc.commit(JSON.stringify(meta))
    if (this.subscriber) this.subscriber(this, heads)
    return heads
  }
}
