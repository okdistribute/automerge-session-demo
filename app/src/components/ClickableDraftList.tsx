/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react/macro'
import React from 'react'
import { Layer } from 'api'
//@ts-ignore
import relativeDate from 'relative-date'
import { HCLColor } from 'd3-color'
import Documents from '../Documents'

let documents = Documents()

type ID = string
export type AuthorColorsType = {
  [key: ID]: HCLColor
}

type TabType = {
  index: number
  isBottom?: boolean
  isMerged?: boolean
} & React.ClassAttributes<HTMLDivElement> &
  React.ButtonHTMLAttributes<HTMLDivElement>

const fileTabBottomStyles = css``
const fileTabMergedStyles = css``

export const FileTab = ({
  index,
  isBottom = false,
  isMerged = false,
  ...props
}: TabType) => (
  <div
    css={css`
      border-top: 1px solid lightgray;
      padding: 10px;
      cursor: pointer;

      &:hover {
        background: #d1eaff;
      }
      ${isBottom ? fileTabBottomStyles : ''}
      ${isMerged ? fileTabMergedStyles : ''}
    `}
    role="button"
    onClick={props.onClick}
    {...props}
  />
)

const InfoText = (props: any) => (
  <small
    css={css`
      color: gray;
      display: block;
      margin-top: 0.4rem;
    `}
    {...props}
  />
)

type Props = {
  onLayerClick: Function
  id: string
  layers: Layer[]
  isBottom?: boolean
  colors?: AuthorColorsType
} & React.ClassAttributes<HTMLDivElement> &
  React.HTMLAttributes<HTMLDivElement>

export default function ClickableDraftList({
  onLayerClick,
  id,
  layers,
  isBottom = false,
  colors = {},
  ...props
}: Props) {
  let upwell = documents.get(id)
  let authors = upwell.metadata.getAuthors()
  return (
    <div {...props}>
      {layers
        .sort((a, b) => b.time - a.time)
        .map((layer: Layer, index) => {
          return (
            <FileTab
              key={layer.id}
              index={index}
              isBottom={isBottom}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onLayerClick(layer)
              }}
              css={css`
                box-shadow: 18px 24px 0px -18px ${colors[
                    layer.authorId
                  ]?.toString() || 'none'} inset;
              `}
            >
              {layer.message}
              <InfoText>
                {authors[layer.authorId]} created{' '}
                {relativeDate(new Date(layer.time))}
              </InfoText>
            </FileTab>
          )
        })}
    </div>
  )
}
