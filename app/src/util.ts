import { DraftMetadata } from 'api'

// only get the drafts you can see:
// - your private drafts
// - shared drafts
export function getYourDrafts(
  drafts: DraftMetadata[],
  rootId: string,
  yourId: string
) {
  return drafts.filter((l) => {
    // don't show root draft
    if (l.id === rootId) {
      return false
    }
    // don't show if it's someone elses' and you aren't on the contributor list
    if (l.authorId !== yourId && l.contributors.indexOf(yourId) === -1) {
      return false
    }
    return true
  })
}
