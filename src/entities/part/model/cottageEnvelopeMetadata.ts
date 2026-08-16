export interface LoveLetterContent {
  readonly title: string
  readonly salutation: string
  readonly body: string
  readonly signature: string
}

export const LOVE_LETTER_TEXT_LIMITS = {
  title: 48,
  salutation: 48,
  body: 1_200,
  signature: 64,
} as const

export const DEFAULT_LOVE_LETTER_CONTENT = {
  title: '写给我最爱的人',
  salutation: '亲爱的你：',
  body: [
    '遇见你以后，我才明白，原来最动人的幸福，不是某一个盛大的瞬间，而是每一个普通日子里都有你。',
    '我喜欢和你分享清晨的第一束光，也喜欢在夜色降临时听你说今天发生的小事。你的笑、你的认真、你偶尔的小脾气，都让我一次又一次确认：我想陪伴的人，一直是你。',
    '愿这间小屋替我收藏我们的回忆，愿花园替我记住每一次心动。未来还有很多路，我想牵着你的手慢慢走，把寻常的日子过成只属于我们的浪漫。',
    '谢谢你来到我的生命里。今天爱你，明天也爱你，以后的每一天，都比昨天多一点。',
  ].join('\n\n'),
  signature: '永远爱你的人',
} as const satisfies LoveLetterContent
