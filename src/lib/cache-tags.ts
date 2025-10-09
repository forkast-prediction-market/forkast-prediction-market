export const cacheTags = {
  notifications: (key: string) => `notifications:${key}`,
  eventComments: (key: string) => `eventcomments:${key}`,
  commentReplies: (key: string | null) => `commentreplies:${key}`,
  commentLikes: (key: string) => `commentlikes:${key}`,
  events: (key: string) => `events:${key}`,
  event: (key: string) => `event:${key}`,
  settings: 'settings',
}
