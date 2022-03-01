/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react/macro";        
import React  from "react";
import { Author } from "api";
import { ReviewView } from "./Review";
import { TextAreaView } from "./TextArea";
import Documents from '../Documents'

let documents = Documents()


// visible 0 or more layers NOT including root
// root

type Props = { id: string, visible: string[], onChange: any, author: Author}

export function EditReviewView(props: Props) {
  const { author, id, visible, onChange } = props;
  let upwell = documents.get(id)
  let root = upwell.rootLayer()

  let [reviewMode, setReviewMode] = React.useState<Boolean>(false);
  if (!root) return <div></div>

  // visible.length === 0 or visible.length > 1
  let reviewView = <ReviewView id={id} visible={visible}></ReviewView>
  let component = reviewView 
  if (visible.length === 1) {
    let layer = upwell.get(visible[0])
    if (author === layer.author) {
      let textArea = <TextAreaView onChange={onChange} editableLayer={layer}></TextAreaView>
      component = <React.Fragment>
        {reviewMode ? reviewView : textArea}
          <button
            css={css`
              margin-bottom: 1ex;
            `}
            onClick={() => setReviewMode(!reviewMode)}
          >
            {reviewMode ? "reviewing" : "editing"}
          </button>
      </React.Fragment>

    }
  }

  return (
    <div css={css` width: 100%;`}>
      {component}
    </div>
  )
} 
