import { Annotation } from '@atjson/document'
import Renderer, { Context } from '@atjson/renderer-hir'
import { schema } from './upwell-pm-schema'

export default class ProsemirrorRenderer extends Renderer {
  *root(): any {
    return schema.node('doc', undefined, yield)
  }

  *renderAnnotation(
    annotation: Annotation<any>,
    context: Context
  ): Iterator<void, any, any> {
    let annotationChildren = (yield).map((c: any) => {
      if (typeof c === 'string') return schema.text(c)
      else return c
    })

    if (annotation.type === 'strong' || annotation.type === 'em') {
      return annotationChildren.map((c: any) => {
        return c.mark([...c.marks, schema.mark(annotation.type)])
      })
    } else if (annotation.type === 'comment') {
      return annotationChildren.map((c: any) => {
        return c.mark([
          ...c.marks,
          schema.mark('comment', {
            id: annotation.id,
            author: annotation.attributes.author,
            authorColor: annotation.attributes.authorColor,
            message: annotation.attributes.message,
          }),
        ])
      })
    } else {
      if (annotationChildren.length === 0) annotationChildren = schema.text(' ')

      return schema.node(
        annotation.type,
        annotation.attributes,
        annotationChildren
      )
    }
  }
}
