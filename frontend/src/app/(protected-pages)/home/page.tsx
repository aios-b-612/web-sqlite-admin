'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

type DatabaseInfo = { name: string; size_bytes: number }
type TableInfo = { name: string; kind: string; sql?: string | null }
type ColumnInfo = {
    cid: number
    name: string
    decl_type: string
    notnull: boolean
    default_value?: string | null
    pk: boolean
}

const TOKEN_KEY = 'octor_sqlite_admin_token'

function apiBase(): string {
    if (typeof window === 'undefined') return ''
    return process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || ''
}

async function api<T>(
    path: string,
    options: RequestInit & { token?: string | null } = {},
): Promise<T> {
    const { token, ...init } = options
    const headers = new Headers(init.headers)
    headers.set('Accept', 'application/json')
    if (init.body && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json')
    }
    if (token) headers.set('Authorization', `Bearer ${token}`)
    const res = await fetch(`${apiBase()}${path}`, { ...init, headers })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
        throw new Error(
            (data as { message?: string }).message || `HTTP ${res.status}`,
        )
    }
    return data as T
}

function formatBytes(n: number): string {
    if (n < 1024) return `${n} B`
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
    return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

const Page = () => {
    const [token, setToken] = useState<string | null>(null)
    const [password, setPassword] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [busy, setBusy] = useState(false)

    const [databases, setDatabases] = useState<DatabaseInfo[]>([])
    const [selectedDb, setSelectedDb] = useState<string | null>(null)
    const [tables, setTables] = useState<TableInfo[]>([])
    const [selectedTable, setSelectedTable] = useState<string | null>(null)
    const [columns, setColumns] = useState<ColumnInfo[]>([])
    const [rows, setRows] = useState<Record<string, unknown>[]>([])
    const [total, setTotal] = useState(0)
    const [offset, setOffset] = useState(0)
    const [sql, setSql] = useState('SELECT name FROM sqlite_master LIMIT 20;')
    const [sqlResult, setSqlResult] = useState<string>('')

    const limit = 50

    useEffect(() => {
        const saved = window.localStorage.getItem(TOKEN_KEY)
        if (saved) setToken(saved)
    }, [])

    const loadDatabases = useCallback(async (auth: string) => {
        const data = await api<{ databases: DatabaseInfo[] }>('/v1/databases', {
            token: auth,
        })
        setDatabases(data.databases)
    }, [])

    useEffect(() => {
        if (!token) return
        setBusy(true)
        setError(null)
        loadDatabases(token)
            .catch((e: Error) => {
                setError(e.message)
                setToken(null)
                window.localStorage.removeItem(TOKEN_KEY)
            })
            .finally(() => setBusy(false))
    }, [token, loadDatabases])

    const login = async (e: React.FormEvent) => {
        e.preventDefault()
        setBusy(true)
        setError(null)
        try {
            const data = await api<{ token: string }>('/v1/auth/login', {
                method: 'POST',
                body: JSON.stringify({ password }),
            })
            window.localStorage.setItem(TOKEN_KEY, data.token)
            setToken(data.token)
            setPassword('')
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Falha no login')
        } finally {
            setBusy(false)
        }
    }

    const openDb = async (name: string) => {
        if (!token) return
        setBusy(true)
        setError(null)
        setSelectedDb(name)
        setSelectedTable(null)
        setRows([])
        setColumns([])
        try {
            const data = await api<{ tables: TableInfo[] }>(
                `/v1/databases/${encodeURIComponent(name)}/tables`,
                { token },
            )
            setTables(data.tables)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erro ao abrir base')
        } finally {
            setBusy(false)
        }
    }

    const openTable = async (table: string, nextOffset = 0) => {
        if (!token || !selectedDb) return
        setBusy(true)
        setError(null)
        setSelectedTable(table)
        setOffset(nextOffset)
        try {
            const data = await api<{
                columns: ColumnInfo[]
                rows: Record<string, unknown>[]
                total: number
            }>(
                `/v1/databases/${encodeURIComponent(selectedDb)}/tables/${encodeURIComponent(table)}/rows?limit=${limit}&offset=${nextOffset}`,
                { token },
            )
            setColumns(data.columns)
            setRows(data.rows)
            setTotal(data.total)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erro ao ler tabela')
        } finally {
            setBusy(false)
        }
    }

    const runSql = async () => {
        if (!token || !selectedDb) return
        setBusy(true)
        setError(null)
        try {
            const data = await api<{ result: unknown }>(
                `/v1/databases/${encodeURIComponent(selectedDb)}/sql`,
                {
                    method: 'POST',
                    token,
                    body: JSON.stringify({ sql }),
                },
            )
            setSqlResult(JSON.stringify(data.result, null, 2))
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erro no SQL')
        } finally {
            setBusy(false)
        }
    }

    const columnNames = useMemo(() => {
        if (rows[0]) return Object.keys(rows[0])
        return columns.map((c) => c.name)
    }, [rows, columns])

    if (!token) {
        return (
            <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center gap-6 px-4">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                        SQLite Admin
                    </h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Painel Octor — substituindo o phpLiteAdmin
                    </p>
                </div>
                <form onSubmit={login} className="flex flex-col gap-3">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Senha
                        <input
                            type="password"
                            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            autoComplete="current-password"
                            required
                        />
                    </label>
                    {error && (
                        <p className="text-sm text-red-600" role="alert">
                            {error}
                        </p>
                    )}
                    <button
                        type="submit"
                        disabled={busy}
                        className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                    >
                        {busy ? 'Entrando…' : 'Entrar'}
                    </button>
                </form>
            </div>
        )
    }

    return (
        <div className="flex min-h-[80vh] flex-col gap-4 p-4 lg:flex-row">
            <aside className="w-full shrink-0 space-y-4 lg:w-64">
                <div className="flex items-center justify-between">
                    <h1 className="text-lg font-semibold">SQLite Admin</h1>
                    <button
                        type="button"
                        className="text-xs text-gray-500 underline"
                        onClick={() => {
                            window.localStorage.removeItem(TOKEN_KEY)
                            setToken(null)
                        }}
                    >
                        Sair
                    </button>
                </div>
                {error && (
                    <p className="text-sm text-red-600" role="alert">
                        {error}
                    </p>
                )}
                <section>
                    <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Bases
                    </h2>
                    <ul className="space-y-1">
                        {databases.map((db) => (
                            <li key={db.name}>
                                <button
                                    type="button"
                                    onClick={() => openDb(db.name)}
                                    className={`w-full rounded-md px-2 py-1.5 text-left text-sm ${
                                        selectedDb === db.name
                                            ? 'bg-primary-100 text-primary-900 dark:bg-primary-900/40 dark:text-primary-100'
                                            : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                                    }`}
                                >
                                    <span className="block truncate font-medium">
                                        {db.name}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                        {formatBytes(db.size_bytes)}
                                    </span>
                                </button>
                            </li>
                        ))}
                        {!databases.length && !busy && (
                            <li className="text-sm text-gray-500">
                                Nenhuma base em LOCATION
                            </li>
                        )}
                    </ul>
                </section>
                {selectedDb && (
                    <section>
                        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Tabelas
                        </h2>
                        <ul className="max-h-80 space-y-1 overflow-auto">
                            {tables.map((t) => (
                                <li key={t.name}>
                                    <button
                                        type="button"
                                        onClick={() => openTable(t.name)}
                                        className={`w-full truncate rounded-md px-2 py-1 text-left text-sm ${
                                            selectedTable === t.name
                                                ? 'bg-primary-100 dark:bg-primary-900/40'
                                                : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                                        }`}
                                    >
                                        {t.name}
                                        <span className="ml-1 text-xs text-gray-400">
                                            {t.kind}
                                        </span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </section>
                )}
            </aside>

            <main className="min-w-0 flex-1 space-y-4">
                {selectedDb && (
                    <section className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                        <h2 className="mb-2 text-sm font-semibold">SQL</h2>
                        <textarea
                            className="h-28 w-full rounded-md border border-gray-300 bg-white p-2 font-mono text-xs dark:border-gray-600 dark:bg-gray-900"
                            value={sql}
                            onChange={(e) => setSql(e.target.value)}
                        />
                        <div className="mt-2 flex gap-2">
                            <button
                                type="button"
                                disabled={busy}
                                onClick={runSql}
                                className="rounded-md bg-primary-600 px-3 py-1.5 text-sm text-white disabled:opacity-60"
                            >
                                Executar
                            </button>
                        </div>
                        {sqlResult && (
                            <pre className="mt-3 max-h-64 overflow-auto rounded-md bg-gray-950 p-3 text-xs text-gray-100">
                                {sqlResult}
                            </pre>
                        )}
                    </section>
                )}

                {selectedTable && (
                    <section className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                        <div className="mb-2 flex items-center justify-between gap-2">
                            <h2 className="text-sm font-semibold">
                                {selectedTable}{' '}
                                <span className="font-normal text-gray-500">
                                    ({total} linhas)
                                </span>
                            </h2>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    className="text-xs underline disabled:opacity-40"
                                    disabled={offset <= 0 || busy}
                                    onClick={() =>
                                        openTable(
                                            selectedTable,
                                            Math.max(0, offset - limit),
                                        )
                                    }
                                >
                                    Anterior
                                </button>
                                <button
                                    type="button"
                                    className="text-xs underline disabled:opacity-40"
                                    disabled={offset + limit >= total || busy}
                                    onClick={() =>
                                        openTable(selectedTable, offset + limit)
                                    }
                                >
                                    Próxima
                                </button>
                            </div>
                        </div>
                        <div className="overflow-auto">
                            <table className="min-w-full border-collapse text-left text-xs">
                                <thead>
                                    <tr className="border-b border-gray-200 dark:border-gray-700">
                                        {columnNames.map((c) => (
                                            <th
                                                key={c}
                                                className="whitespace-nowrap px-2 py-1 font-semibold"
                                            >
                                                {c}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((row, i) => (
                                        <tr
                                            key={i}
                                            className="border-b border-gray-100 dark:border-gray-800"
                                        >
                                            {columnNames.map((c) => (
                                                <td
                                                    key={c}
                                                    className="max-w-xs truncate px-2 py-1 font-mono"
                                                    title={String(
                                                        row[c] ?? '',
                                                    )}
                                                >
                                                    {row[c] === null ||
                                                    row[c] === undefined
                                                        ? 'NULL'
                                                        : typeof row[c] ===
                                                            'object'
                                                          ? JSON.stringify(
                                                                row[c],
                                                            )
                                                          : String(row[c])}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {!rows.length && (
                                <p className="py-6 text-center text-sm text-gray-500">
                                    Sem linhas
                                </p>
                            )}
                        </div>
                    </section>
                )}

                {!selectedDb && (
                    <p className="text-sm text-gray-500">
                        Selecione uma base SQLite à esquerda.
                    </p>
                )}
            </main>
        </div>
    )
}

export default Page
