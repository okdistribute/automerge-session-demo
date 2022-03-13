/** @jsxImportSource @emotion/react */
import React, { useRef } from 'react'
import { Layer } from 'api'
import { AuthorColorsType } from './ListDocuments'

import { schema } from '../upwell-pm-schema'
import { useProseMirror, ProseMirror } from 'use-prosemirror'
import { keymap } from 'prosemirror-keymap'
import { baseKeymap } from 'prosemirror-commands'
import ProsemirrorRenderer from '../ProsemirrorRenderer'
import { ReplaceStep, AddMarkStep, RemoveMarkStep } from 'prosemirror-transform'
import UpwellSource from './upwell-source'
import { css } from '@emotion/react'

type Props = {
  editableLayer: Layer
  onChange: any
  colors?: AuthorColorsType
}

export const textCSS = css`
  width: 100%;
  height: 100%;
  border: 1px solid lightgray;
  border-width: 0 1px 1px 0;
  padding: 34px;
  resize: none;
  font-size: 16px;
  line-height: 20px;
  border-radius: 3px;
  background-color: white;
  overflow: auto;

  white-space: pre-line;

  :focus-visible {
    outline: 0;
  }
`

export function EditorView(props: Props) {
  let { editableLayer, onChange, colors = {} } = props

  let marks = editableLayer.marks.map((m: any) => {
    let attrs: any = {}
    if (m.value && m.value.length > 0) attrs = JSON.parse(m.value)
    if (colors) attrs['authorColor'] = colors[attrs.author]?.toString()
    // I wonder if there's a (good) way to preserve identity of the mark
    // here (id? presumably?) Or I guess just the mark itself?) so that we
    // can do direct actions on the Upwell layer via the atjson annotation
    // as a proxy.
    return {
      start: m.start,
      end: m.end,
      type: `-upwell-${m.type}`,
      attributes: attrs,
    }
  })

  let atjsonLayer = new UpwellSource({
    content: editableLayer.text, //.replaceAll('\n', '¶'),
    annotations: marks,
  })

  console.log(atjsonLayer)
  let pmDoc = ProsemirrorRenderer.render(atjsonLayer)
  console.log({ pmdoc: pmDoc })

  const [state, setState] = useProseMirror({
    schema,
    doc: pmDoc,
    plugins: [keymap({ ...baseKeymap })],
  })

  const viewRef = useRef(null)

  let pm2am = (position: number, doc: any): number => {
    let max = Math.min(position - 1, doc.textContent.length)
    let min = Math.max(max, 0)
    return min
  }

  let dispatchHandler = (transaction: any) => {
    console.log(transaction)
    console.log(editableLayer.text)
    for (let step of transaction.steps) {
      console.log(step)
      if (step instanceof ReplaceStep) {
        let from = pm2am(step.from, transaction.before)
        let to = pm2am(step.to, transaction.before)
        if (from !== to) {
          console.log(
            `DELETING AT ${from}: ${editableLayer.text.substring(from, to)}`
          )
          editableLayer.deleteAt(from, to - from)
        }
        if (step.slice) {
          // @ts-ignore
          if (step.structure === false) {
            // insertion
            const insertedContent = step.slice.content.textBetween(
              0,
              step.slice.content.size
            )
            console.log(`INSERTING AT ${from}: ${insertedContent}`)
            editableLayer.insertAt(from, insertedContent)
          } else {
            // @ts-ignore
            if (step.slice.content.content.length === 2 && from === to) {
              console.log(from, to, editableLayer.marks)
              let relevantMarks = editableLayer.marks.filter(
                // @ts-ignore
                (m) => m.start < from && m.end >= to && m.type === 'paragraph'
              )

              if (relevantMarks.length != 1)
                throw new Error(
                  'unhandled case. only expected one paragraph here.'
                )
              let relevantMark = relevantMarks[0]
              let prevEnd = relevantMark.end
              console.log('here is the relevant mark', relevantMark)
              editableLayer.doc.set(relevantMark.id, 'end', to)
              editableLayer.mark('paragraph', `[${from}..${prevEnd})`, '')
            }
          }
        }
      }
    }

    let newState = state.apply(transaction)
    setState(newState)
    onChange(editableLayer)
  }

  const color = colors[editableLayer.author]
  console.log(state)
  return (
    <ProseMirror
      state={state}
      ref={viewRef}
      dispatchTransaction={dispatchHandler}
      css={css`
        ${textCSS}
        box-shadow: 0 10px 0 -2px ${color?.toString() || 'none'} inset;
        caret-color: ${color?.copy({ opacity: 1 }).toString() || 'auto'};
      `}
    />
  )
}
