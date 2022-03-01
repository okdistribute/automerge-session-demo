import { Author, Upwell, Layer, Heads } from '../src/index'
import { it } from 'mocha';
import { assert } from 'chai';

describe('upwell', () => {
  it('subscribes to document changes', async () => {
    let d = Upwell.create()
    let layers = d.layers()
    assert.lengthOf(layers, 1)

    let doc: Layer = layers[0].fork('New layer', 'Susan')
    d.add(doc)
    assert.lengthOf(d.layers(), 2)

    let times = 0
    doc.subscribe((doc: Layer, heads: Heads) => {
      times++
      if (times === 1) assert.equal(doc.text, 'Hello')
      if (times === 2) assert.equal(doc.text, 'Hola')
    })

    doc.insertAt(0, 'H')
    doc.insertAt(1, 'e')
    doc.insertAt(2, 'l')
    doc.insertAt(3, 'l')
    doc.insertAt(4, 'o')
    doc.commit('Added hello')

    doc.insertAt(0, 'H')
    doc.deleteAt(1)
    doc.insertAt(1, 'o')
    doc.deleteAt(2)
    doc.deleteAt(3)
    doc.insertAt(3, 'a')
    doc.deleteAt(4)
    doc.commit('Translated to Spanish')
    await new Promise(resolve => setTimeout(resolve, 1000));
    assert.equal(times, 2)
  })

  it('saves and loads from a file', () => {
    let d = Upwell.create()
    let e = Upwell.create()

    let layers = d.layers()
    let ddoc = layers[0]
    let file = ddoc.save()
    let edoc = Layer.load(ddoc.id, file)
    e.add(edoc)

    ddoc.insertAt(0, Array.from('Upwelling: Contextual Writing'), 'title')

    let binary = ddoc.save()
    let layer = Layer.load(ddoc.id, binary)
    e.add(layer)
    assert.equal(layer.title, ddoc.title)
  })


  it('creates layers with authors', () => {
    let first_author: Author =  'Susan'
    let d = Upwell.create({ author: first_author })
    let layers = d.layers()
    let doc = layers[0]

    doc.insertAt(0, 'H')
    doc.insertAt(1, 'e')
    doc.insertAt(2, 'l')
    doc.insertAt(3, 'l')
    doc.insertAt(4, 'o')
    assert.equal(doc.text, 'Hello')

    assert.equal(d.layers()[0].text, 'Hello')

    let name = 'Started typing on the train'
    let author: Author = 'Theroux'
    let newLayer = doc.fork(name, author)
    d.add(newLayer)

    newLayer.insertAt(0, 'H')
    newLayer.deleteAt(1)
    newLayer.insertAt(1, 'o')
    newLayer.deleteAt(2)
    newLayer.deleteAt(3)
    newLayer.insertAt(3, 'a')
    newLayer.deleteAt(4)
    assert.equal(newLayer.text, 'Hola')
    assert.equal(newLayer.author, author)
  })

  describe('merges two layers', () => {
    let first_author: Author =  'Susan'
    let d = Upwell.create({ author: first_author})
    let layers = d.layers()
    let doc = layers[0]
    assert.equal(layers.length, 1)
    doc.insertAt(0, 'H')
    doc.insertAt(1, 'e')
    doc.insertAt(2, 'l')
    doc.insertAt(3, 'l')
    doc.insertAt(4, 'o')
    assert.equal(doc.text, 'Hello')


    let name = 'Started typing on the train'
    let author: Author = 'Theroux'
    let newLayer = doc.fork(name, author)
    d.add(newLayer)

    let rootId = d.rootLayer().id

    newLayer.insertAt(5, ' ')
    newLayer.insertAt(6, 'w')
    newLayer.insertAt(7, 'o')
    newLayer.insertAt(8, 'r')
    newLayer.insertAt(9, 'l')
    newLayer.insertAt(10, 'd')

    let merged = Layer.merge(doc, newLayer)
    assert.equal(merged.text, 'Hello world')

    d.add(merged)
    layers = d.layers()
    assert.equal(layers.length, 2)

    it('can be archived', () => {
      d.archive(newLayer.id)
      layers = d.layers()
      assert.equal(layers[1].archived, true)
      let root = d.rootLayer()
      assert.equal(root.id, rootId)
      assert.equal(doc.id, rootId)
    })

  })

  it('makes layers visible and shared',() => {
    let first_author: Author =  'Susan'
    let d = Upwell.create({ author: first_author})
    let layers = d.layers()
    let doc = layers[0]
    d.share(doc.id)
    assert.equal(doc.shared, true)

    let serialized = doc.save()

    let inc = Upwell.create({ author: 'Theroux' })
    inc.add(Layer.load(doc.id, serialized))
    let incomingLayers = inc.layers()
    assert.equal(incomingLayers.length, 2)

    let incomingShared = incomingLayers[1]
    assert.deepEqual(incomingShared.metadata, doc.metadata)
    assert.equal(incomingShared.author, 'Susan')
    assert.equal(incomingShared.shared, true)
    assert.equal(incomingShared.archived, false)
  })

  it('gets root layer', () => {
    let first_author: Author =  'Susan'
    let d = Upwell.create({ author: first_author })
    let layers = d.layers()
    let doc = layers[0]
    let root = d.rootLayer()
    assert.deepEqual(root.text, doc.text)
    assert.deepEqual(root.title, doc.title)
    assert.deepEqual(root.metadata, doc.metadata)

    d.add(doc.fork("beep boop", "john"))

    root = d.rootLayer()
    assert.deepEqual(root.text, doc.text)
    assert.deepEqual(root.title, doc.title)
    assert.deepEqual(root.metadata, doc.metadata)
  })

  it('maintains keys when multiple documents involved', () => {
    let first_author: Author =  'Susan'
    let d = Upwell.create({ author: first_author })

    let og = d.layers()[0]

    let layer = og.fork('', first_author)
    d.add(layer)
    d.share(layer.id)

    let boop = layer.fork('', first_author)
    d.add(boop)

    assert.equal(d.layers().filter(l => l.shared).length, 1)

    boop = boop.fork('', first_author)
    d.add(boop)
    d.share(boop.id)


    boop = boop.fork('', first_author)
    d.add(boop)

    for (let i = 0; i < 100; i++) {
      assert.equal(d.layers().filter(l => l.shared).length, 2)
    }
  })
})