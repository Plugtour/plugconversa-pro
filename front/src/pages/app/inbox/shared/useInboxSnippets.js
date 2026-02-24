// caminho: front/src/pages/app/inbox/shared/useInboxSnippets.js
import { useEffect, useState } from 'react'
import { pickArrayFromPayload, pickLatestMessageText } from './inboxUtils'

export function useInboxSnippets({ clientId, conversations, apiGet }) {
  const [snippetMap, setSnippetMap] = useState({})

  useEffect(() => {
    let alive = true

    async function run() {
      const list = Array.isArray(conversations) ? conversations : []
      if (list.length === 0) return

      const MAX = 30
      const slice = list.slice(0, MAX)

      const need = slice.filter((c) => {
        const id = Number(c?.id)
        if (!id) return false
        const lastAt = c?.last_message_at || null
        const cached = snippetMap[id]
        if (!cached) return true
        return String(cached.lastAt || '') !== String(lastAt || '')
      })

      if (need.length === 0) return

      const results = await Promise.all(
        need.map(async (c) => {
          const id = Number(c.id)
          try {
            const payload = await apiGet(`/inbox/conversations/${id}/messages`, { clientId })
            const msgs = pickArrayFromPayload(payload)
            const text = pickLatestMessageText(msgs)
            return { id, lastAt: c?.last_message_at || null, text }
          } catch {
            return { id, lastAt: c?.last_message_at || null, text: '' }
          }
        })
      )

      if (!alive) return

      setSnippetMap((prev) => {
        const next = { ...(prev || {}) }
        for (const r of results) {
          if (!r?.id) continue
          if (r.text) next[r.id] = { text: r.text, lastAt: r.lastAt }
          else if (!next[r.id]) next[r.id] = { text: '', lastAt: r.lastAt }
        }
        return next
      })
    }

    run()

    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversations])

  return { snippetMap }
}
// fim: front/src/pages/app/inbox/shared/useInboxSnippets.js