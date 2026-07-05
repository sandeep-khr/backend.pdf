# backend.pdf

A todo app with a real SQL database running inside a single PDF file.

Download [`backend.pdf`](backend.pdf), open it in Chrome or Edge, and it just runs.
Add todos, or scroll down to the SQL console and query your data using SQL:

```sql
select * from todos where done = 0 order by id desc;
```

**No server, no database file.** The SQL engine and your data both live inside the PDF.

## Saving

Your data lives in the document. To keep changes, click the viewer's **download
icon** (Cmd+S just re-downloads the original). Then "deploying" your app is like emailing
the file.

Your rows really are in the bytes:

```
strings backend.pdf | grep "buy milk"
```

## How it works

The PDF embeds a small SQL engine (tokenizer, parser, executor) and a todo app
written in plain Javascript, which the viewer runs in its built-in JS engine. The UI
is ordinary PDF form fields; state is kept in a hidden field and saved back into the
file.

## What it supports

`CREATE TABLE`, `INSERT`, `SELECT` (WHERE / ORDER BY / LIMIT), `UPDATE`, `DELETE`.
No joins or aggregates yet.

Works in Chrome/Edge (and Acrobat, which saves with Cmd+S). Viewers that don't run
PDF JavaScript will just show an empty form.

## Building

```
npm run build   # regenerates backend.pdf
npm test        # runs the SQL engine test suite
