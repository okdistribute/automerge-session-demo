/** @jsxImportSource @emotion/react */
import React, { useCallback, useEffect } from "react";
import ReactRenderer, { ReactRendererProvider } from "@atjson/renderer-react";
import * as components from "./review-components"
import UpwellSource from "./upwell-source"
import { Layer } from "api";
import { textCSS } from './TextArea';

type ReviewState = {
  atjsonLayer?: UpwellSource;
};

export function ReviewView(props: {visible: Layer[], rootLayer: Layer}) {
  const { rootLayer, visible } = props;

  let updateAtjsonState = useCallback(async function () {
    if (!visible.length) {
      let atjsonLayer = new UpwellSource({ content: rootLayer.text, annotations: []})
      setState({atjsonLayer })
      return
    }
    let mergedVisible = visible.slice(1).reduce(Layer.merge, visible[0])
    let editsLayer = Layer.mergeWithEdits(rootLayer, mergedVisible)
    let marks = editsLayer.marks.map((m: any) => {
      let attrs = JSON.parse(m.value)
      // I wonder if there's a (good) way to preserve identity of the mark
      // here (id? presumably?) Or I guess just the mark itself?) so that we
      // can do direct actions on the Upwell layer via the atjson annotation
      // as a proxy.
      return { start: m.start, end: m.end, type: `-upwell-${m.type}`, attributes: attrs }
    })

    // generate paragraph annotations
    let pidx = 0;
    while (pidx !== -1) {
      let start = pidx;
      pidx = editsLayer.text.indexOf("\n", pidx + 1)
      let end = (pidx === -1) ? editsLayer.text.length : pidx
      marks.push({ start: start, end: end, type: "-upwell-paragraph", attributes: {}})
    }

    let atjsonLayer = new UpwellSource({content: editsLayer.text, annotations: marks});
    setState({ atjsonLayer: atjsonLayer });
  }, [visible, rootLayer])

  useEffect(() => {
    updateAtjsonState()
  }, [updateAtjsonState, visible])

  // This is not a good proxy for the correct state, but DEMO MODE.
  let [ state, setState ] = React.useState<ReviewState>({})
  if (!state.atjsonLayer) {
    updateAtjsonState()
    return <div>Loading...</div>
  } else {
    return (
      <ReactRendererProvider value={components}>
        <article css={textCSS}>{ReactRenderer.render(state.atjsonLayer)}</article>
      </ReactRendererProvider>
    )
  }

}
