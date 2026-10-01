import { useState, type FormEvent } from 'react'

type ChannelSearchFormProps = {
  loading: boolean
  onSearch: (query: string) => void
}

export function ChannelSearchForm({ loading, onSearch }: ChannelSearchFormProps) {
  const [query, setQuery] = useState('')
  const trimmed = query.trim()

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!trimmed || loading) {
      return
    }
    onSearch(trimmed)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <label
        htmlFor="channel-query"
        className="text-[11px] font-medium tracking-[0.16em] text-muted uppercase"
      >
        Channel ID or handle
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          id="channel-query"
          name="query"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="@handle, UC… channel ID, or channel URL"
          autoComplete="off"
          autoFocus
          spellCheck={false}
          className="h-12 flex-1 rounded-lg border border-line bg-panel px-4 text-sm text-ink outline-none placeholder:text-muted/70 focus:border-accent"
        />
        <button
          type="submit"
          disabled={loading || trimmed.length === 0}
          className="h-12 rounded-lg bg-accent px-5 text-sm font-medium text-white transition-colors hover:bg-[#c43222] disabled:cursor-not-allowed disabled:opacity-45"
        >
          {loading ? 'Analyzing…' : 'Analyze'}
        </button>
      </div>
    </form>
  )
}
