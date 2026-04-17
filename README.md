# Sofa Production Planning Prototype

Prototype web app (no backend) to validate **weekly** production planning requirements for a sofa factory.

## How to preview locally

```bash
python3 -m http.server 8080
# then open http://localhost:8080
```

- UI entry point: `index.html`
- App bootstrap: `src/app.js`

## Updated planner workflow (business meaning)

1. Planner works from **Weekly Planning Queue**.
2. Pending items can be changed to Confirmed by pressing **Confirm Customer** button.
3. Confirmed items become ready for weekly planning/release.
4. Weekly plan can still be created even if selected items are below 36 (warning only).
5. Release page sends eligible lines to production and marks them Released.

## UI pages

- **Weekly Planning Queue**: grouped by planning status, weekly filters, customer confirmation action, and weekly plan creation.
- **Weekly Plans**: plan week summary + visible capacity warning if below target 36.
- **Release**: release controls and generated production orders.
- **Delay Analysis**: late/overdue monitoring scaffold.

## Import scope

- File input is **Mock Import** only for prototype walkthrough.
- Real Excel import from ERP Vector is future scope.
